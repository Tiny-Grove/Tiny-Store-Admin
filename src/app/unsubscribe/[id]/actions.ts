"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmUnsubscribe(customerId: string) {
  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ email_opt_out: true })
    .eq("id", customerId);

  redirect(`/unsubscribe/${customerId}?done=1`);
}
