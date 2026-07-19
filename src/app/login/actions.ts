"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "tinygrove.co.uk";

export async function signInWithGoogle(callbackUrl: string) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`,
      queryParams: {
        // Hints Google to only list accounts from this Workspace domain.
        // This is a UX hint only — /auth/callback enforces the real check.
        hd: ALLOWED_DOMAIN,
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_init_failed");
  }

  redirect(data.url);
}
