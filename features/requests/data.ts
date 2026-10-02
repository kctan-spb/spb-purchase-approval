import { getDb } from "@/lib/db/client";
import type { PurchaseRequest } from "@/lib/db/types";

export type RequestFilters = { status?: string; category?: string };

export async function listRequests(filters: RequestFilters = {}): Promise<PurchaseRequest[]> {
  const db = await getDb();
  let q = db.from("purchase_requests").select("*").order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.category) q = q.eq("category", filters.category);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function listPendingRequests(): Promise<PurchaseRequest[]> {
  const rows = await listRequests({ status: "pending" });
  // Priority per docs/INTELLIGENCE_LAYER: higher amount, older, non-routine first.
  const score = (r: PurchaseRequest) => {
    const ageDays = (Date.now() - new Date(r.created_at).getTime()) / 86_400_000;
    return r.amount / 1000 + ageDays + (r.routine ? 0 : 2);
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
  return data ? { ...data, amount: Number(data.amount) } : null;
}

export async function spendingSummary() {
  const rows = await listRequests();
  const sum = (s: string) => rows.filter((r) => r.status === s).reduce((t, r) => t + r.amount, 0);
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    pendingTotal: sum("pending"),
    approvedTotal: sum("approved"),
    pendingCount: count("pending"),
    approvedCount: count("approved"),
    rejectedCount: count("rejected"),
  };
}
