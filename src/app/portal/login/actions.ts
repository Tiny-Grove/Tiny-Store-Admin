"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PortalLoginState {
  error?: string;
}

export async function signInWithPasswordAction(
  _prevState: PortalLoginState,
  formData: FormData
): Promise<PortalLoginState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/portal";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!customer) {
    await supabase.auth.signOut();
    return { error: "No account found for this login." };
  }

  redirect(callbackUrl);
}

export async function signInWithGooglePortal(callbackUrl: string) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/portal/auth/callback?callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`,
    },
  });

  if (error || !data.url) {
    redirect("/portal/login?error=oauth_init_failed");
  }

  redirect(data.url);
}
