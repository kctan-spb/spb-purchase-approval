import { getDb } from "@/lib/db/client";
import { requireOrgUser } from "@/lib/auth";
import type { Category } from "@/lib/db/types";

export async function listCategories(): Promise<Category[]> {
  const { orgId } = await requireOrgUser();
  const db = await getDb();
  const { data, error } = await db.from("categories").select("*").eq("org_id", orgId).order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
