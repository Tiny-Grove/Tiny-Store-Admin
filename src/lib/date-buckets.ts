// Shared month-bucketing helpers for trend charts (revenue, churn, customer
// growth) so they all key/label months identically.
export function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

// Empty, ordered buckets for the trailing `monthsBack` months (oldest first,
// ending with the current, still-in-progress month).
export function emptyMonthBuckets(monthsBack: number): Map<string, number> {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1)
  );

  const buckets = new Map<string, number>();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    buckets.set(monthKey(d), 0);
  }
  return buckets;
}
