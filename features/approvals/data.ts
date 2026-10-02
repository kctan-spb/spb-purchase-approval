import { getDb } from "@/lib/db/client";
import { getApprovalLimit, type CurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import type { Approval } from "@/lib/db/types";

export async function listApprovalsByRequest(requestId: string): Promise<Approval[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("approvals")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Pending requests this approver may actually decide (not their own, within their limit). 0 for non-approvers. */
export async function countDecidablePending(user: CurrentUser): Promise<number> {
  if (!user.canApprove) return 0;
  try {
    const [limit, settings] = await Promise.all([getApprovalLimit(), getSettings()]);
    const db = await getDb();
    let q = db.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!settings.allowSelfApproval) q = q.neq("user_id", user.id);
    if (limit !== null) q = q.lte("amount_myr", limit);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
