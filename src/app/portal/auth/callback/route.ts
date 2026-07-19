import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/customer-invite";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const activationToken = searchParams.get("activation_token");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portal";

  if (!code) {
    return NextResponse.redirect(`${origin}/portal/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/portal/login?error=auth_failed`);
  }

  const user = data.user;
  const email = user.email!.toLowerCase();
  const admin = createAdminClient();

  if (activationToken) {
    const hash = hashInviteToken(activationToken);
    const { data: customer } = await admin
      .from("customers")
      .select("id, email, invited_at")
      .eq("invite_token_hash", hash)
      .maybeSingle();

    const expired =
      !customer?.invited_at ||
      Date.now() - new Date(customer.invited_at).getTime() > INVITE_TTL_MS;

    if (!customer || expired || customer.email.toLowerCase() !== email) {
      await supabase.auth.signOut();
      await admin.auth.admin.deleteUser(user.id);
      return NextResponse.redirect(
        `${origin}/portal/activate/${activationToken}?error=mismatch`
      );
    }

    await admin
      .from("customers")
      .update({
        auth_user_id: user.id,
        account_status: "active",
        activated_at: new Date().toISOString(),
        invite_token_hash: null,
      })
      .eq("id", customer.id);

    return NextResponse.redirect(`${origin}/portal`);
  }

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!existingCustomer) {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
    return NextResponse.redirect(`${origin}/portal/login?error=no_account`);
  }

  return NextResponse.redirect(`${origin}${callbackUrl}`);
}
