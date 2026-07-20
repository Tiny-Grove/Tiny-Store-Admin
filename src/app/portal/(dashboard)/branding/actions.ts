"use server";

import { revalidatePath } from "next/cache";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadCustomerAsset } from "@/lib/customer-assets";

export async function updateColors(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const primary_color = (formData.get("primary_color") as string) || null;
  const secondary_color = (formData.get("secondary_color") as string) || null;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ primary_color, secondary_color, updated_at: new Date().toISOString() })
    .eq("id", customer.id);

  revalidatePath("/portal/branding");
}

export async function uploadLogo(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const file = formData.get("logo") as File;
  const url = await uploadCustomerAsset(customer.id, file, "logo");
  if (!url) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", customer.id);

  revalidatePath("/portal/branding");
}

export async function uploadFavicon(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const file = formData.get("favicon") as File;
  const url = await uploadCustomerAsset(customer.id, file, "favicon");
  if (!url) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ favicon_url: url, updated_at: new Date().toISOString() })
    .eq("id", customer.id);

  revalidatePath("/portal/branding");
}
