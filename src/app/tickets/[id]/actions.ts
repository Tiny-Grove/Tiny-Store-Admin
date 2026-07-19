"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addCustomerReply(ticketId: string, formData: FormData) {
  const body = (formData.get("body") as string)?.trim();
  if (!ticketId || !body) return;

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("customer_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return;

  const { data: customer } = await admin
    .from("customers")
    .select("email")
    .eq("id", ticket.customer_id)
    .maybeSingle();

  await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_type: "customer",
    author_email: customer?.email ?? "unknown",
    body,
  });

  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    .update({ status: "open", last_message_at: now, updated_at: now })
    .eq("id", ticketId);

  revalidatePath(`/tickets/${ticketId}`);
}
