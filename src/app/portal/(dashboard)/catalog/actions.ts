"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

function parsePriceToCents(value: string) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

export async function createProduct(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const price = (formData.get("price") as string) ?? "0";

  if (!name) return;

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .insert({
      customer_id: customer.id,
      name,
      description,
      price_cents: parsePriceToCents(price),
    })
    .select("id")
    .single();

  revalidatePath("/portal/catalog");
  if (product?.id) redirect(`/portal/catalog/${product.id}`);
}

export async function deleteProduct(productId: string) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const admin = createAdminClient();
  await admin
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("customer_id", customer.id);

  revalidatePath("/portal/catalog");
  redirect("/portal/catalog");
}
