"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveHeader(formData: FormData) {
  const headerHtml = (formData.get("header_html") as string) ?? "";

  const admin = createAdminClient();
  await admin
    .from("email_layout")
    .update({ header_html: headerHtml, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/emails");
}

export async function saveFooter(formData: FormData) {
  const footerHtml = (formData.get("footer_html") as string) ?? "";

  const admin = createAdminClient();
  await admin
    .from("email_layout")
    .update({ footer_html: footerHtml, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/emails");
}

export async function createTemplate(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const bodyHtml = (formData.get("body_html") as string) ?? "";

  if (!name || !subject) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("email_templates")
    .insert({ name, subject, body_html: bodyHtml })
    .select("id")
    .single();

  revalidatePath("/emails");
  if (data?.id) redirect(`/emails/${data.id}`);
}

export async function deleteTemplate(templateId: string) {
  const admin = createAdminClient();
  await admin.from("email_templates").delete().eq("id", templateId);

  revalidatePath("/emails");
  redirect("/emails");
}
