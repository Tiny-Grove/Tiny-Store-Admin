"use server";

import { revalidatePath } from "next/cache";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/format";

export async function updateProduct(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const productId = formData.get("productId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const price = (formData.get("price") as string) ?? "0";

  if (!productId || !name) return;

  const admin = createAdminClient();
  await admin
    .from("products")
    .update({
      name,
      description,
      price_cents: parsePriceToCents(price),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("customer_id", customer.id);

  revalidatePath(`/portal/catalog/${productId}`);
  revalidatePath("/portal/catalog");
}

export async function uploadProductImage(formData: FormData) {
  const customer = await getPortalCustomer();
  if (!customer) return;

  const productId = formData.get("productId") as string;
  const file = formData.get("image") as File;
  if (!productId || !file || file.size === 0) return;

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (!product) return;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${customer.id}/products/${productId}.${ext}`;

  const { error } = await admin.storage
    .from("customer-assets")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) return;

  const { data: urlData } = admin.storage.from("customer-assets").getPublicUrl(path);

  await admin
    .from("products")
    .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", productId);

  revalidatePath(`/portal/catalog/${productId}`);
  revalidatePath("/portal/catalog");
}
