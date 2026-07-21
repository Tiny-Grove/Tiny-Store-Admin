"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateCustomerState {
  error?: string;
}

export async function createCustomer(
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

  const { data: customer, error } = await admin
    .from("customers")
    .insert({ email, name, company, account_status: "active" })
    .select("id")
    .single();

  if (error || !customer) {
    return { error: "A customer with this email already exists." };
  }

  redirect(`/customers/${customer.id}`);
}
