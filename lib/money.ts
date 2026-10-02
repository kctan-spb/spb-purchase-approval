// Strict money parsing and shared money constants. Pure functions only (no imports) so they can be
// unit-tested with `node --experimental-strip-types`.

export const CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = "MYR";
export const MAX_AMOUNT = 999_999_999.99;

export function isCurrency(v: string): v is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(v);
}

export type MoneyResult = { ok: true; value: number; text: string } | { ok: false; error: string };

// Optional prefix: RM, a currency code, or a currency symbol, followed by optional spaces.
const PREFIX = /^(?:RM|MYR|USD|SGD|EUR|GBP|US\$|S\$|\$|€|£)\s*/i;
// Digits with correct thousands commas (1,234,567) or plain digits, then up to 2 decimals.
const NUMBER = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/;

/**
 * Parse a user-typed amount. Accepts "1200", "1,200.50", "RM 1,200.50", "MYR1200.5", "$ 99".
 * Rejects exponents (1e3), hex (0x10), European formats (1.234,56), misplaced commas (1,2,3),
 * more than 2 decimals, zero/negative values and anything above 999,999,999.99.
 */
export function parseAmount(input: string | null | undefined): MoneyResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Enter an amount, for example 1,200.50." };
  if (raw.startsWith("-")) return { ok: false, error: "The amount must be greater than 0." };

  const body = raw.replace(PREFIX, "").trim();
  if (!body) return { ok: false, error: "Enter an amount, for example 1,200.50." };

  const m = NUMBER.exec(body);
  if (!m) {
    if (/^[\d.,]+$/.test(body) && /,\d{1,2}$/.test(body) && body.includes("."))
      return { ok: false, error: "Use a full stop for cents and commas for thousands, for example 1,234.56." };
    return { ok: false, error: "Enter numbers only, for example 1,200.50 (no letters or symbols)." };
  }
  const decimals = m[2] ?? "";
  if (decimals.length > 2) return { ok: false, error: "Use at most 2 decimal places, for example 1,200.50." };

  const whole = m[1].replace(/,/g, "");
  const cents = Number(whole) * 100 + Number((decimals + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return { ok: false, error: "That amount is too large." };
  if (cents <= 0) return { ok: false, error: "The amount must be greater than 0." };
  if (cents > Math.round(MAX_AMOUNT * 100)) return { ok: false, error: "The amount cannot exceed 999,999,999.99." };

  const value = cents / 100;
  return { ok: true, value, text: value.toFixed(2) };
}
