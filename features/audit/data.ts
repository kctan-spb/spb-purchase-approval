import { getDb } from "@/lib/db/client";
import type { AuditLog } from "@/lib/db/types";

// Read-only. Every audit row is written by database triggers/functions, never by the app.

export async function listAuditLogs(
  limit = 200,
  range: { from?: string; to?: string } = {},
): Promise<AuditLog[]> {
  const db = await getDb();
  let q = db.from("audit_logs").select("*").order("created_at", { ascending: false });
  if (range.from) q = q.gte("created_at", range.from);
  if (range.to) q = q.lt("created_at", range.to);
  const { data, error } = await q.limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAuditLogsForEntity(entityId: string): Promise<AuditLog[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("audit_logs")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
