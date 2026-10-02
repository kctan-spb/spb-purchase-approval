// Time frame filtering. Days are Malaysia calendar days (UTC+8, no DST), matching how dates are shown.
const MYT_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;

export const RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
] as const;

export type Range = (typeof RANGES)[number]["value"];

export type Timeframe = {
  range: Range;
  /** Inclusive lower bound (ISO), if any. */
  from?: string;
  /** Exclusive upper bound (ISO), if any. */
  to?: string;
  /** Raw yyyy-mm-dd values for the custom date inputs. */
  fromInput: string;
  toInput: string;
  label: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(ms: number) {
  const t = new Date(ms + MYT_MS);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - MYT_MS;
}

function parseDay(v: string | undefined): number | undefined {
  if (!v || !DATE_RE.test(v)) return undefined;
  const ms = Date.parse(`${v}T00:00:00+08:00`);
  return Number.isNaN(ms) ? undefined : ms;
}

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

export function resolveTimeframe(
  sp: { range?: string; from?: string; to?: string } = {},
  now: number = Date.now(),
): Timeframe {
  const known = RANGES.some((r) => r.value === sp.range);
  const range: Range = known ? (sp.range as Range) : sp.from || sp.to ? "custom" : "all";
  const today = dayStart(now);
  const base = { fromInput: "", toInput: "" };

  switch (range) {
    case "today":
      return { ...base, range, from: new Date(today).toISOString(), label: "Today" };
    case "7d":
      return { ...base, range, from: new Date(today - 6 * DAY_MS).toISOString(), label: "Last 7 days" };
    case "30d":
      return { ...base, range, from: new Date(today - 29 * DAY_MS).toISOString(), label: "Last 30 days" };
    case "month": {
      const t = new Date(now + MYT_MS);
      const start = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - MYT_MS;
      return { ...base, range, from: new Date(start).toISOString(), label: "This month" };
    }
    case "lastmonth": {
      const t = new Date(now + MYT_MS);
      const start = Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1) - MYT_MS;
      const end = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - MYT_MS; // exclusive
      return { ...base, range, from: new Date(start).toISOString(), to: new Date(end).toISOString(), label: "Last month" };
    }
    case "quarter": {
      const t = new Date(now + MYT_MS);
      const start = Date.UTC(t.getUTCFullYear(), Math.floor(t.getUTCMonth() / 3) * 3, 1) - MYT_MS;
      return { ...base, range, from: new Date(start).toISOString(), label: "This quarter" };
    }
    case "year": {
      const t = new Date(now + MYT_MS);
      const start = Date.UTC(t.getUTCFullYear(), 0, 1) - MYT_MS;
      return { ...base, range, from: new Date(start).toISOString(), label: "This year" };
    }
    case "custom": {
      let f = parseDay(sp.from);
      let t = parseDay(sp.to);
      if (f !== undefined && t !== undefined && t < f) [f, t] = [t, f]; // swapped dates still work
      const fromInput = f !== undefined ? new Date(f + MYT_MS).toISOString().slice(0, 10) : "";
      const toInput = t !== undefined ? new Date(t + MYT_MS).toISOString().slice(0, 10) : "";
      const label =
        f !== undefined && t !== undefined
          ? `${fmt(f)} to ${fmt(t)}`
          : f !== undefined
            ? `From ${fmt(f)}`
            : t !== undefined
              ? `Up to ${fmt(t)}`
              : "All time";
      return {
        range,
        from: f !== undefined ? new Date(f).toISOString() : undefined,
        to: t !== undefined ? new Date(t + DAY_MS).toISOString() : undefined,
        fromInput,
        toInput,
        label,
      };
    }
    default:
      return { ...base, range: "all", label: "All time" };
  }
}

/** Query string carrying the active filters, for the export links. */
export function filterQuery(f: { type?: string; status?: string; category?: string; range?: string; from?: string; to?: string }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
}
