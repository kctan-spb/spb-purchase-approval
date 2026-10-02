import { getDb } from "@/lib/db/client";
import type { PurchaseRequest } from "@/lib/db/types";

export type RequestFilters = {
  status?: string;
  category?: string;
  /** Inclusive lower bound on created_at (ISO). */
  from?: string;
  /** Exclusive upper bound on created_at (ISO). */
  to?: string;
};

function normalise(r: PurchaseRequest): PurchaseRequest {
  return {
    ...r,
    amount: Number(r.amount),
    amount_myr: r.amount_myr === null || r.amount_myr === undefined ? null : Number(r.amount_myr),
  };
}

export async function listRequests(filters: RequestFilters = {}): Promise<PurchaseRequest[]> {
  const db = await getDb();
  let q = db.from("purchase_requests").select("*").order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lt("created_at", filters.to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalise);
}

export async function listPendingRequests(): Promise<PurchaseRequest[]> {
  const rows = await listRequests({ status: "pending" });
  // Priority per docs/INTELLIGENCE_LAYER: higher amount, older, non-routine first (compared in MYR).
  const score = (r: PurchaseRequest) => {
    const ageDays = (Date.now() - new Date(r.created_at).getTime()) / 86_400_000;
    return (r.amount_myr ?? r.amount) / 1000 + ageDays + (r.routine ? 0 : 2);
  };
  return rows.sort((a, b) => score(b) - score(a));
}

export async function getRequest(id: string): Promise<PurchaseRequest | null> {
  const db = await getDb();
  const { data, error } = await db.from("purchase_requests").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null; // malformed uuid
    throw new Error(error.message);
  }
  return data ? normalise(data) : null;
}

export type SummaryRow = { status: string; currency: string; n: number; total: number; totalMyr: number | null };

export type StatusSummary = {
  count: number;
  /** One total per currency; never mixed. */
  byCurrency: { currency: string; total: number }[];
  /** Sum of the MYR equivalents (null when no row has one). */
  totalMyr: number | null;
};

/** Totals per status and currency, computed by the database (not capped at 1000 rows). */
export async function spendingSummary(
  filters: Pick<RequestFilters, "from" | "to"> = {},
): Promise<Record<"pending" | "approved" | "rejected", StatusSummary>> {
  const db = await getDb();
  const { data, error } = await db.rpc("request_summary", {
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
  });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as { status: string; currency: string; n: number | string; total: number | string; total_myr: number | string | null }[]).map(
    (r): SummaryRow => ({
      status: r.status,
      currency: r.currency,
      n: Number(r.n),
      total: Number(r.total),
      totalMyr: r.total_myr === null || r.total_myr === undefined ? null : Number(r.total_myr),
    }),
  );
  const make = (status: string): StatusSummary => {
    const mine = rows.filter((r) => r.status === status);
    const withMyr = mine.filter((r) => r.totalMyr !== null);
    return {
      count: mine.reduce((t, r) => t + r.n, 0),
      byCurrency: mine.map((r) => ({ currency: r.currency, total: r.total })),
      totalMyr: withMyr.length ? withMyr.reduce((t, r) => t + (r.totalMyr ?? 0), 0) : null,
    };
  };
  return { pending: make("pending"), approved: make("approved"), rejected: make("rejected") };
}
