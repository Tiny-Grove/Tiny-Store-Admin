import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared by the admin app and the customer portal — both let a customer's
// logo/favicon be uploaded to the same storage bucket.
export async function uploadCustomerAsset(
  customerId: string,
  file: File,
  filename: string
) {
  if (!file || file.size === 0) return null;

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${customerId}/${filename}.${ext}`;

  const { error } = await admin.storage
    .from("customer-assets")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) return null;

  const { data } = admin.storage.from("customer-assets").getPublicUrl(path);
  return data.publicUrl;
}
