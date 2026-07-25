import "server-only";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { emptyMonthBuckets, monthKey, monthLabel } from "@/lib/date-buckets";

export interface MonthlyRevenue {
  key: string; // "2026-01"
  label: string; // "Jan 26"
  amountCents: number;
}

// Revenue is derived live from Stripe's paid invoices (the actual settled
// amounts), not a local ledger — consistent with the rest of this app's
// "read straight from Stripe" approach. Trailing window includes the
// current, still-in-progress month as its final bucket.
export async function getMonthlyRevenue(
  monthsBack = 12
): Promise<MonthlyRevenue[]> {
  if (!isStripeConfigured()) return [];

  const buckets = emptyMonthBuckets(monthsBack);
  const [oldestYear, oldestMonth] = buckets.keys().next().value!.split("-").map(Number);
  const start = new Date(Date.UTC(oldestYear, oldestMonth - 1, 1));

  const stripe = getStripe();
  await stripe.invoices
    .list({
      status: "paid",
      created: { gte: Math.floor(start.getTime() / 1000) },
      limit: 100,
    })
    .autoPagingEach((invoice) => {
      const paidAt = invoice.status_transitions.paid_at ?? invoice.created;
      const d = new Date(paidAt * 1000);
      const key = monthKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + invoice.amount_paid);
      }
    });

  return Array.from(buckets.entries()).map(([key, amountCents]) => ({
    key,
    label: monthLabel(key),
    amountCents,
  }));
}
