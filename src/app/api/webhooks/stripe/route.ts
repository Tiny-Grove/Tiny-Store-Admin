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

  return NextResponse.json({ received: true });
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
