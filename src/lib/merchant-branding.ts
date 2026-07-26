import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MerchantBranding {
  primary: string;
  secondary: string;
}

// Shared by the storefront's success/cancel pages, which live outside the
// main page.tsx tree and so need their own lookup to carry the merchant's
// colors through the checkout redirect (rather than falling back to this
// admin app's own brand colors).
export async function getMerchantBranding(slug: string): Promise<MerchantBranding> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("primary_color, secondary_color")
    .eq("slug", slug)
    .maybeSingle();

  return {
    primary: data?.primary_color || "#4f46e5",
    secondary: data?.secondary_color || "#0f172a",
  };
}
