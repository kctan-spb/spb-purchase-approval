import { getDb } from "@/lib/db/client";
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
