/** MYR shows as "RM 1,234.56"; other currencies show their code (e.g. "USD 1,234.56"). */
export function formatMoney(amount: number | string, currency = "MYR") {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
      currencyDisplay: currency === "MYR" ? "symbol" : "code",
    })
      .format(n)
      .replace(/ /g, " ");
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Per-currency totals as one line, e.g. "RM 10,000.00 · USD 2,000.00". Never adds currencies together. */
export function formatTotals(rows: { currency: string; total: number }[]) {
  const parts = rows.filter((r) => r.total !== 0).map((r) => formatMoney(r.total, r.currency));
  return parts.length ? parts.join(" · ") : formatMoney(0, "MYR");
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}
