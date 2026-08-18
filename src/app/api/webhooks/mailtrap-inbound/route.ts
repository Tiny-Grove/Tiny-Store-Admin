import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransactionalClient } from "@/lib/mailtrap";

// Mailtrap's inbound webhook envelope. Field names for the event summary
// aren't fully pinned down in Mailtrap's (still-evolving, as of writing)
// inbound docs, so this parses defensively and leans on the confirmed
// Messages API shape for everything that actually matters.
interface InboundWebhookEvent {
  event?: string;
  type?: string;
  message_id?: string;
  id?: string;
  inbox_id?: number;
}
interface InboundWebhookBody {
  events?: InboundWebhookEvent[];
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// Parses "Name <email@domain.com>" or a bare "email@domain.com".
function parseAddress(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim().toLowerCase(), name: name || null };
  }
  return { email: raw.trim().toLowerCase(), name: null };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function POST(request: Request) {
  const secret = process.env.MAILTRAP_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("mailtrap-signature");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: InboundWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inboxId = Number(process.env.MAILTRAP_INBOUND_INBOX_ID);
  if (!inboxId) {
    return NextResponse.json({ error: "MAILTRAP_INBOUND_INBOX_ID not set" }, { status: 500 });
  }

  const events = body.events ?? [];
  const admin = createAdminClient();

  for (const event of events) {
    const eventType = event.event ?? event.type ?? "";
    if (!eventType.includes("message_received")) continue;

    const messageId = event.message_id ?? event.id;
    if (!messageId) continue;
    // Only one inbound inbox is configured (the support address) — skip
    // anything from a different inbox if the event happens to name one.
    if (event.inbox_id && event.inbox_id !== inboxId) continue;

    // Constructed per-event (memoized after the first call) rather than
    // eagerly at the top of the handler, so a request with no relevant
    // events never requires MAILTRAP_API_TOKEN to be set.
    try {
      const client = getTransactionalClient();
      await processMessage(client, admin, inboxId, messageId);
    } catch (err) {
      console.error("mailtrap-inbound: failed to process message", messageId, err);
    }
  }

  return NextResponse.json({ received: true });
}

async function processMessage(
  client: ReturnType<typeof getTransactionalClient>,
  admin: ReturnType<typeof createAdminClient>,
  inboxId: number,
  messageId: string
) {
  const message = await client.inbound.messages.get(inboxId, messageId);
  if (!message.from) return;

  const { email: fromEmail, name: fromName } = parseAddress(message.from);
  const body = message.text_body?.trim() || (message.html_body ? stripHtml(message.html_body) : "") || "(no content)";

  // A reply to an admin's notification email carries a support+<ticketId>@
  // address (see src/lib/ticket-email.ts) — thread it onto that ticket.
  let ticketId: string | null = null;
  for (const to of message.to) {
    const match = to.match(/\+([0-9a-fA-F-]{36})@/);
    if (match) {
      const { data: ticket } = await admin
        .from("support_tickets")
        .select("id")
        .eq("id", match[1])
        .maybeSingle();
      if (ticket) {
        ticketId = ticket.id;
        break;
      }
    }
  }

  if (!ticketId) {
    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("email", fromEmail)
      .maybeSingle();

    const { data: newTicket } = await admin
      .from("support_tickets")
      .insert({
        customer_id: customer?.id ?? null,
        guest_email: customer ? null : fromEmail,
        guest_name: customer ? null : fromName,
        subject: message.subject?.trim() || "(no subject)",
      })
      .select("id")
      .single();

    if (!newTicket) return;
    ticketId = newTicket.id;
  }

  // Unique index on external_message_id makes a retried webhook delivery
  // a no-op instead of a duplicate message.
  const { error } = await admin
    .from("support_ticket_messages")
    .upsert(
      {
        ticket_id: ticketId,
        author_type: "customer",
        author_email: fromEmail,
        body,
        channel: "email",
        external_message_id: message.id,
      },
      { onConflict: "external_message_id", ignoreDuplicates: true }
    );
  if (error) throw error;

  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    .update({ status: "open", last_message_at: now, updated_at: now })
    .eq("id", ticketId);
}
