import { getDb } from "@/lib/db/client";
import type { AuditLog } from "@/lib/db/types";

export async function writeAuditLog(entry: {
  action: string;
  entity_type?: string;
  entity_id: string | null;
  details?: Record<string, unknown>;
}) {
  const db = await getDb();
  const { error } = await db.from("audit_logs").insert({
    action: entry.action,
    entity_type: entry.entity_type ?? "purchase_request",
    entity_id: entry.entity_id,
    details: entry.details ?? null,
  });
  if (error) throw new Error(`Audit log write failed: ${error.message}`);
}

export async function listAuditLogs(limit = 200): Promise<AuditLog[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
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
