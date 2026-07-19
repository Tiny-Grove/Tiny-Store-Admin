import "server-only";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export interface MonthlyRevenue {
  key: string; // "2026-01"
  label: string; // "Jan 26"
  amountCents: number;
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

// Revenue is derived live from Stripe's paid invoices (the actual settled
// amounts), not a local ledger — consistent with the rest of this app's
// "read straight from Stripe" approach. Trailing window includes the
// current, still-in-progress month as its final bucket.
export async function getMonthlyRevenue(
  monthsBack = 12
): Promise<MonthlyRevenue[]> {
  if (!isStripeConfigured()) return [];

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1)
  );

  const buckets = new Map<string, number>();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    buckets.set(monthKey(d), 0);
  }

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
