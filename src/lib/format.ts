export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

// Compact form for chart axes/labels — e.g. £12.3K, £1.2M.
export function formatMoneyCompact(cents: number) {
  return (cents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}
