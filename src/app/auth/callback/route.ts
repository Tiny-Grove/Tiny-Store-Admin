import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "tinygrove.co.uk";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = data.user;
  const email = user.email!.toLowerCase();
  const domain = email.split("@")[1];

  // Google's `hd` (hosted domain) claim, if Supabase surfaces it — not all
  // providers/flows populate this, so it's an extra check when present
  // rather than a requirement. The email domain check below is the real gate.
  const hd = (
    (user.user_metadata?.hd as string | undefined) ??
    (user.identities?.[0]?.identity_data?.hd as string | undefined)
  )?.toLowerCase();

  const isAllowedDomain = domain === ALLOWED_DOMAIN && (!hd || hd === ALLOWED_DOMAIN);

  // Domain membership alone isn't enough — the account must also be an
  // active row in the admin allowlist (see supabase/migrations).
  const admin = createAdminClient();
  const { data: adminUser } = await admin
    .from("admin_users")
    .select("active")
    .eq("email", email)
    .maybeSingle();

  if (!isAllowedDomain || !adminUser?.active) {
    // Supabase auto-creates the auth.users row on first OAuth login — tear it
    // down immediately rather than leaving an unauthorized account behind.
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
    return NextResponse.redirect(`${origin}/login?error=access_denied`);
  }

  return NextResponse.redirect(`${origin}${callbackUrl}`);
}
