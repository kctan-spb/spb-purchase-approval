import { getDb } from "@/lib/db/client";
import type { Category } from "@/lib/db/types";

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const { data, error } = await db.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
