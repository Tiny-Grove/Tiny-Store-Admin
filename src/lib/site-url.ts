import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteSettings } from "@/lib/supabase/types";

// The storefront/checkout base URL — editable from Settings (site_settings
// table) so it no longer needs a redeploy to change. Falls back to the
// PUBLIC_SITE_URL env var for environments that haven't set it in the UI yet.
export async function getSiteUrl(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("site_url")
    .eq("id", 1)
    .maybeSingle<Pick<SiteSettings, "site_url">>();

  const configured = data?.site_url?.trim();
  return configured || process.env.PUBLIC_SITE_URL || null;
}
