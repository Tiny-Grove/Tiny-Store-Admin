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

export function parsePriceToCents(value: string) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}
