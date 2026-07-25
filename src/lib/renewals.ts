import "server-only";
import { getStripe } from "@/lib/stripe";

// A "renewal" is a paid invoice after the subscription's first one — Stripe
// doesn't expose a renewal count directly, so it's derived from invoice
// history (same "read straight from Stripe" approach as revenue.ts). Keyed
// by our local subscriptions.stripe_subscription_id.
export async function getRenewalCounts(
  stripeSubscriptionIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (stripeSubscriptionIds.length === 0) return counts;

  const stripe = getStripe();
  await Promise.all(
    stripeSubscriptionIds.map(async (subscriptionId) => {
      let paidCount = 0;
      await stripe.invoices
        .list({ subscription: subscriptionId, status: "paid", limit: 100 })
        .autoPagingEach(() => {
          paidCount += 1;
        });
      counts.set(subscriptionId, Math.max(0, paidCount - 1));
    })
  );

  return counts;
}
