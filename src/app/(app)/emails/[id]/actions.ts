"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateTemplate(formData: FormData) {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const bodyHtml = (formData.get("body_html") as string) ?? "";

  if (!id || !name || !subject) return;

  const admin = createAdminClient();
  await admin
    .from("email_templates")
    .update({
      name,
      subject,
      body_html: bodyHtml,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/emails/${id}`);
  revalidatePath("/emails");
}
