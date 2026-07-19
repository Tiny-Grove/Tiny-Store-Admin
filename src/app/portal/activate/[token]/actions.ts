"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/customer-invite";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ActivateState {
  error?: string;
}

export async function activateWithPassword(
  _prevState: ActivateState,
  formData: FormData
): Promise<ActivateState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const admin = createAdminClient();
  const hash = hashInviteToken(token);
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("invite_token_hash", hash)
    .maybeSingle();

  if (!customer) {
    return { error: "This activation link is invalid or has expired." };
  }

  const expired =
    !customer.invited_at ||
    Date.now() - new Date(customer.invited_at).getTime() > INVITE_TTL_MS;

  if (expired) {
    return {
      error: "This activation link has expired. Ask Tiny Store to resend your invite.",
    };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: customer.email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: "Could not create your account. Please try again." };
  }

  await admin
    .from("customers")
    .update({
      auth_user_id: created.user.id,
      account_status: "active",
      activated_at: new Date().toISOString(),
      invite_token_hash: null,
    })
    .eq("id", customer.id);

  const sessionClient = await createClient();
  await sessionClient.auth.signInWithPassword({
    email: customer.email,
    password,
  });

  redirect("/portal");
}

export async function activateWithGoogle(token: string) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/portal/auth/callback?activation_token=${encodeURIComponent(token)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/portal/activate/${token}?error=oauth_init_failed`);
  }

  redirect(data.url);
}
