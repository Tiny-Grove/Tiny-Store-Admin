"use server";

import { revalidatePath } from "next/cache";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateBusinessDetails(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const name = (formData.get("name") as string)?.trim() || null;
  const company = (formData.get("company") as string)?.trim() || null;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ name, company, updated_at: new Date().toISOString() })
    .eq("id", customer.id);

  revalidatePath("/portal/business");
  revalidatePath("/portal");
}
