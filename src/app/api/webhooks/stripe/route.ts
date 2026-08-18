import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, mapStripeStatus } from "@/lib/stripe";

// Billing events for the platform's own Stripe account (subscriptions
// customers pay Tiny Store for) — distinct from stripe-connect/route.ts,
// which handles the merchants' *connected* accounts and storefront sales.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscriptionFromEvent(event);
  }

  // Starts/stops the 7-day countdown to automatic suspension (see
  // /api/cron/suspend-overdue-accounts) — never suspends or reactivates
  // directly here, since reactivation after a suspension must always be a
  // deliberate admin/staff action.
  if (event.type === "invoice.payment_failed") {
    await markPaymentFailed(event);
  }
  if (event.type === "invoice.payment_succeeded") {
    await clearPaymentFailed(event);
  }

  return NextResponse.json({ received: true });
}

function invoiceCustomerId(invoice: Stripe.Invoice): string | null {
  if (!invoice.customer) return null;
  return typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id;
}

async function markPaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = invoiceCustomerId(invoice);
  if (!stripeCustomerId) return;

  const admin = createAdminClient();
  // Only set if not already set — a retry within the same failing streak
  // shouldn't push the 7-day deadline back.
  await admin
    .from("customers")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId)
    .is("payment_failed_at", null);
}

async function clearPaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = invoiceCustomerId(invoice);
  if (!stripeCustomerId) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ payment_failed_at: null })
    .eq("stripe_customer_id", stripeCustomerId);
}

async function syncSubscriptionFromEvent(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const admin = createAdminClient();

  const { data: local } = await admin
    .from("subscriptions")
    .select("id, customer_id, status")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (!local) return; // not a subscription we're tracking locally

  const newStatus = mapStripeStatus(sub.status);
  const item = sub.items.data[0];

  await admin
    .from("subscriptions")
    .update({
      status: newStatus,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
    })
    .eq("id", local.id);

  const wasCanceled = local.status === "canceled";
  const isCanceled = newStatus === "canceled";
  if (!wasCanceled && isCanceled) {
    await logSubscriptionEvent(admin, local.id, local.customer_id, "canceled", event);
  } else if (wasCanceled && !isCanceled) {
    await logSubscriptionEvent(admin, local.id, local.customer_id, "reactivated", event);
  }
}

async function logSubscriptionEvent(
  admin: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  customerId: string,
  eventType: "canceled" | "reactivated",
  event: Stripe.Event
) {
  const { error } = await admin.from("subscription_events").insert({
    subscription_id: subscriptionId,
    customer_id: customerId,
    event_type: eventType,
    stripe_event_id: event.id,
    occurred_at: new Date(event.created * 1000).toISOString(),
  });
  // 23505 = unique violation on stripe_event_id — Stripe redelivered an
  // event we've already recorded, safe to ignore.
  if (error && error.code !== "23505") {
    console.error("Failed to log subscription event", error);
  }
}
