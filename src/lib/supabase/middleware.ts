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
];

// Paths in the admin area reachable without an admin session.
const ADMIN_PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function updateSession(request: NextRequest) {
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

  const path = request.nextUrl.pathname;

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
      .select("active")
      .eq("email", user.email!.toLowerCase())
      .maybeSingle();

    if (!adminRow?.active) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "access_denied");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
