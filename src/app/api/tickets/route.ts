import { NextResponse, type NextRequest } from "next/server";
import { isValidApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreateTicketBody {
  email?: string;
  name?: string;
  subject?: string;
  message?: string;
}

// Called by the mobile app's backend (server-to-server, shared API key) to
// open a new support ticket on behalf of one of its users.
export async function POST(request: NextRequest) {
  if (!isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateTicketBody | null;
  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim() || null;
  const subject = body?.subject?.trim();
  const message = body?.message?.trim();

  if (!email || !subject || !message) {
    return NextResponse.json(
      { error: "email, subject, and message are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let customerId = existingCustomer?.id as string | undefined;

  if (!customerId) {
    const { data: createdCustomer, error: customerError } = await admin
      .from("customers")
      .insert({ email, name })
      .select("id")
      .single();

    if (customerError || !createdCustomer) {
      return NextResponse.json(
        { error: "Could not create customer record" },
        { status: 500 }
      );
    }
    customerId = createdCustomer.id;
  }

  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert({ customer_id: customerId, subject })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Could not create ticket" }, { status: 500 });
  }

  await admin.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    author_type: "customer",
    author_email: email,
    body: message,
  });

  return NextResponse.json({ id: ticket.id }, { status: 201 });
}
