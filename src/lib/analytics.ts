import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyMonthBuckets, monthKey, monthLabel } from "@/lib/date-buckets";

export interface MonthlyCount {
  key: string;
  label: string;
  value: number;
}

function windowStart(buckets: Map<string, number>) {
  const [year, month] = buckets.keys().next().value!.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function bucketize(
  rows: { at: string }[],
  buckets: Map<string, number>
): MonthlyCount[] {
  for (const row of rows) {
    const d = new Date(row.at);
    const key = monthKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([key, value]) => ({
    key,
    label: monthLabel(key),
    value,
  }));
}

// New customers signed up per month — a simple count of customers.created_at
// falling in each trailing month.
export async function getCustomerGrowth(monthsBack = 12): Promise<MonthlyCount[]> {
  const buckets = emptyMonthBuckets(monthsBack);
  const start = windowStart(buckets);

  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("created_at")
    .gte("created_at", start.toISOString());

  return bucketize((data ?? []).map((row) => ({ at: row.created_at as string })), buckets);
}

// Subscriptions that transitioned to "canceled" per month, from the
// webhook-logged subscription_events table (see supabase/migrations/
// 20260725150000_subscription_events.sql).
export async function getChurnTrend(monthsBack = 12): Promise<MonthlyCount[]> {
  const buckets = emptyMonthBuckets(monthsBack);
  const start = windowStart(buckets);

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_events")
    .select("occurred_at")
    .eq("event_type", "canceled")
    .gte("occurred_at", start.toISOString());

  return bucketize((data ?? []).map((row) => ({ at: row.occurred_at as string })), buckets);
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

// Current snapshot of subscriptions by status — not a trend, just "where do
// things stand right now."
export async function getSubscriptionStatusBreakdown(): Promise<StatusBreakdown[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("subscriptions").select("status");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const status = row.status as string;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}
