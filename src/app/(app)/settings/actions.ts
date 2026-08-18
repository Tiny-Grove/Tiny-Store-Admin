"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import type { AdminRole } from "@/lib/supabase/types";

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

// Pre-creates the admin_users row so the invited person can sign in — actual
// account creation still happens on their first Google OAuth login (see
// src/app/auth/callback/route.ts), which requires both this row (active)
// and a tinygrove.co.uk email.
export async function addAdminUser(formData: FormData) {
  if (!(await requireAdmin())) return;

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = (formData.get("role") as AdminRole) || "staff";
  if (!email) return;

  const admin = createAdminClient();
  await admin
    .from("admin_users")
    .upsert({ email, role, active: true }, { onConflict: "email" });

  revalidatePath("/settings");
}

export async function updateAdminUserRole(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = formData.get("id") as string;
  const role = formData.get("role") as AdminRole;
  if (!id || !role) return;

  const admin = createAdminClient();
  await admin.from("admin_users").update({ role }).eq("id", id);

  revalidatePath("/settings");
}

export async function toggleAdminUserActive(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = formData.get("id") as string;
  const currentlyActive = formData.get("active") === "true";
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("admin_users").update({ active: !currentlyActive }).eq("id", id);

  revalidatePath("/settings");
}

// The storefront/checkout base URL, editable here instead of only via the
// PUBLIC_SITE_URL env var (see src/lib/site-url.ts for how it's read).
export async function updateSiteUrl(formData: FormData) {
  if (!(await requireAdmin())) return;

  const raw = (formData.get("site_url") as string)?.trim() ?? "";
  const siteUrl = raw.replace(/\/+$/, ""); // strip trailing slash(es) — callers append their own leading "/"

  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .update({ site_url: siteUrl || null })
    .eq("id", 1);

  revalidatePath("/settings");
  revalidatePath("/customers", "layout");
}

// The Mailtrap From address, editable here instead of only via the
// MAIL_FROM_EMAIL env var (see src/lib/mailtrap.ts for how it's read).
// MAILTRAP_API_TOKEN stays an env-only secret — it isn't exposed to this
// form. Mailtrap has no separate "sending domain" API parameter, so
// unlike the storefront domain there's nothing else to store here.
export async function updateMailtrapSettings(formData: FormData) {
  if (!(await requireAdmin())) return;

  const from = (formData.get("mail_from_email") as string)?.trim() ?? "";

  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .update({ mail_from_email: from || null })
    .eq("id", 1);

  revalidatePath("/settings");
  revalidatePath("/emails", "layout");
}
