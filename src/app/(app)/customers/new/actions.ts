"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInviteToken, sendInviteEmail } from "@/lib/customer-invite";

export interface CreateCustomerState {
  error?: string;
}

export async function createCustomerInvite(
  _prevState: CreateCustomerState,
  formData: FormData
): Promise<CreateCustomerState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const company = (formData.get("company") as string)?.trim() || null;

  if (!email) return { error: "Email is required." };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { error: "A customer with this email already exists." };
  }

  const { raw, hash } = generateInviteToken();

  const { data: customer, error } = await admin
    .from("customers")
    .insert({
      email,
      name,
      company,
      account_status: "invited",
      invite_token_hash: hash,
      invited_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { error: "A customer with this email already exists." };
  }

  const result = await sendInviteEmail({ to: email, name, rawToken: raw });

  redirect(
    result.sent
      ? `/customers/${customer.id}`
      : `/customers/${customer.id}?invite_email_error=1`
  );
}
