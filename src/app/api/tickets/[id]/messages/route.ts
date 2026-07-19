import { NextResponse, type NextRequest } from "next/server";
import { isValidApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface AddMessageBody {
  message?: string;
}

// Called by the mobile app's backend when a user replies to an existing
// ticket from within the app. Reopens the ticket if it was resolved.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as AddMessageBody | null;
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, customer_id")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { data: customer } = await admin
    .from("customers")
    .select("email")
    .eq("id", ticket.customer_id)
    .maybeSingle();

  await admin.from("support_ticket_messages").insert({
    ticket_id: id,
    author_type: "customer",
    author_email: customer?.email ?? "unknown",
    body: message,
  });

  const now = new Date().toISOString();
  await admin
    .from("support_tickets")
    .update({ status: "open", last_message_at: now, updated_at: now })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
