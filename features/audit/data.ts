import { getDb } from "@/lib/db/client";
import { getOrgUser, requireOrgUser } from "@/lib/auth";
import type { AuditLog } from "@/lib/db/types";

export async function writeAuditLog(entry: {
  action: string;
  entity_type?: string;
  entity_id: string | null;
  details?: Record<string, unknown>;
}) {
  const db = await getDb();
  const user = await getOrgUser();
  if (!user) throw new Error("Audit log write failed: no active organization");
  const { error } = await db.from("audit_logs").insert({
    org_id: user.orgId,
    user_id: user.id,
    action: entry.action,
    entity_type: entry.entity_type ?? "purchase_request",
    entity_id: entry.entity_id,
    details: entry.details ?? null,
  });
  if (error) throw new Error(`Audit log write failed: ${error.message}`);
}

export async function listAuditLogs(
  limit = 200,
  range: { from?: string; to?: string } = {},
): Promise<AuditLog[]> {
  const { orgId } = await requireOrgUser();
  const db = await getDb();
  let q = db.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (range.from) q = q.gte("created_at", range.from);
  if (range.to) q = q.lt("created_at", range.to);
  const { data, error } = await q.limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAuditLogsForEntity(entityId: string): Promise<AuditLog[]> {
  const { orgId } = await requireOrgUser();
  const db = await getDb();
  const { data, error } = await db
    .from("audit_logs")
    .select("*")
    .eq("org_id", orgId)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
