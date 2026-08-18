"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReplyEmail } from "@/lib/ticket-email";

export async function replyToTicket(formData: FormData) {
  const ticketId = formData.get("ticketId") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!ticketId || !body) return;

  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  const authorEmail = user?.email;
  if (!authorEmail) return;

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("subject, customer_id, guest_email")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return;

  // Guest tickets (originated from an email address not matched to a
  // customer) have no customers row to look up — reply to guest_email
  // instead, and skip the in-app notification since there's no account to
  // receive it.
  let replyToEmail = ticket.guest_email;
  if (ticket.customer_id) {
    const { data: customer } = await admin
      .from("customers")
      .select("email")
      .eq("id", ticket.customer_id)
      .maybeSingle();
    replyToEmail = customer?.email ?? null;
  }

  await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_type: "admin",
    author_email: authorEmail,
    body,
  });

  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    .update({ status: "pending", last_message_at: now, updated_at: now })
    .eq("id", ticketId);

  if (replyToEmail) {
    await sendTicketReplyEmail({
      to: replyToEmail,
      subject: `Re: ${ticket.subject}`,
      replyBody: body,
      ticketId,
    });
  }

  if (ticket.customer_id) {
    await admin.from("notifications").insert({
      customer_id: ticket.customer_id,
      type: "ticket_reply",
      title: `Re: ${ticket.subject}`,
      body,
      data: { ticketId },
    });
  }

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
}

export async function setTicketStatus(ticketId: string, formData: FormData) {
  const status = formData.get("status") as string;
  if (!ticketId || !status) return;

  const admin = createAdminClient();
  await admin
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
}
