"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Grows the shared industry list — every customer profile's Industry
// dropdown reads from this same table.
export async function addIndustry(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const admin = createAdminClient();
  await admin
    .from("industries")
    .upsert({ name }, { onConflict: "name", ignoreDuplicates: true });

  revalidatePath("/settings");
  revalidatePath("/customers", "layout");
}
