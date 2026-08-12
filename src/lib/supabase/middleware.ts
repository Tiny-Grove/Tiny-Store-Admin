import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Paths anyone can reach with no session at all — customer-support surfaces,
// server-to-server APIs authenticated their own way (shared API key /
// webhook signature), and the public merchant storefronts + their checkout
// webhook.
const FULLY_PUBLIC_PATHS = [
  "/unsubscribe",
  "/tickets",
  "/api/tickets",
  "/api/plans",
  "/store",
  "/api/webhooks/stripe-connect",
  "/api/webhooks/stripe",
  "/connect/return",
];

// Paths in the admin area reachable without an admin session.
const ADMIN_PUBLIC_PATHS = ["/login", "/auth/callback"];

// Admin-area paths that require the "admin" role specifically — "staff"
// can reach everything else. Higher blast radius than day-to-day
// customer/support work: money (Finance, business Analytics) and access
// control (Settings, which now manages admin_users).
const ADMIN_ONLY_PATHS = ["/settings", "/finance", "/analytics"];

// When a request arrives on the dedicated storefront domain (site_settings.
// site_url), only these customer-facing paths are servable — everything
// else 404s so the admin panel is never reachable from that host. API/
// webhook routes are server-to-server and stay reachable everywhere, so
// they're checked separately rather than listed here.
const STOREFRONT_DOMAIN_ALLOWED_PATHS = ["/store", "/connect/return"];

// The storefront hostname rarely changes, so it's cached in module scope
// (persists across warm invocations of this edge function) rather than
// queried on every single request on top of the existing auth lookup.
let storefrontHostnameCache: { hostname: string | null; expiresAt: number } | null = null;
const STOREFRONT_HOSTNAME_CACHE_TTL_MS = 60_000;

async function getStorefrontHostname(): Promise<string | null> {
  if (storefrontHostnameCache && storefrontHostnameCache.expiresAt > Date.now()) {
    return storefrontHostnameCache.hostname;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("site_url")
    .eq("id", 1)
    .maybeSingle<{ site_url: string | null }>();

  const raw = data?.site_url?.trim() || process.env.PUBLIC_SITE_URL || null;
  let hostname: string | null = null;
  if (raw) {
    try {
      hostname = new URL(raw).hostname.toLowerCase();
    } catch {
      hostname = null;
    }
  }

  storefrontHostnameCache = { hostname, expiresAt: Date.now() + STOREFRONT_HOSTNAME_CACHE_TTL_MS };
  return hostname;
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // TEMP: production diagnostic only, reverted before done.
  if (request.nextUrl.searchParams.get("__debughost") === "1") {
    return NextResponse.json({
      hostHeader: request.headers.get("host"),
      xForwardedHost: request.headers.get("x-forwarded-host"),
      nextUrlHostname: request.nextUrl.hostname,
      storefrontHostname: await getStorefrontHostname(),
    });
  }

  // Host-based domain split: on the dedicated storefront domain, only
  // storefront + API/webhook routes exist — everything else (dashboard,
  // login, customer records, etc.) 404s so the admin panel is never
  // reachable from a customer-facing host. Checked before auth so blocked
  // requests skip the Supabase session lookup entirely.
  const requestHostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const storefrontHostname = await getStorefrontHostname();
  if (storefrontHostname && requestHostname === storefrontHostname) {
    const isStorefrontAllowed =
      STOREFRONT_DOMAIN_ALLOWED_PATHS.some((p) => path.startsWith(p)) ||
      path.startsWith("/api/");
    if (!isStorefrontAllowed) {
      return NextResponse.rewrite(new URL("/__not-found__", request.url));
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Must call getUser() (not getSession()) — it revalidates the token against
  // Supabase Auth rather than trusting an unverified cookie value.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (FULLY_PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return response;
  }

  // --- Admin area ---
  const isAdminPublic = ADMIN_PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isAdminPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isAdminPublic) {
    // Customers now share this same Supabase Auth instance, so "has a
    // session" no longer implies "is an admin" — every admin-area request
    // must check the allowlist, not just login time. RLS blocks the
    // anon-key session client from reading admin_users, hence the
    // service-role client here.
    const admin = createAdminClient();
    const { data: adminRow } = await admin
      .from("admin_users")
      .select("active, role")
      .eq("email", user.email!.toLowerCase())
      .maybeSingle();

    if (!adminRow?.active) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "access_denied");
      return NextResponse.redirect(loginUrl);
    }

    const isAdminOnlyPath = ADMIN_ONLY_PATHS.some((p) => path.startsWith(p));
    if (isAdminOnlyPath && adminRow.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
