"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { writeAuditLog } from "@/features/audit/data";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/db/types";

const NOT_ADMIN = "Only admins can manage categories.";
async function isAdmin() {
  return !!(await getCurrentUser())?.isAdmin;
}

function refresh() {
  revalidatePath("/categories");
  revalidatePath("/requests/new");
  revalidatePath("/");
  revalidatePath("/audit");
}

export async function createCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!(await isAdmin())) return { error: NOT_ADMIN, values: { name } };
  if (!name) return { fieldErrors: { name: "Name is required." }, values: { name } };
  const db = await getDb();
  const { data, error } = await db.from("categories").insert({ name }).select("id").single();
  if (error) {
    if (error.code === "23505")
      return { fieldErrors: { name: "That category already exists." }, values: { name } };
    return { error: "Could not add category. Please try again.", values: { name } };
  }
  await writeAuditLog({ action: "create", entity_type: "category", entity_id: data.id, details: { name } });
  refresh();
  return { values: {} };
}

export async function renameCategory(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!(await isAdmin())) return { error: NOT_ADMIN, values: { name } };
  if (!name) return { fieldErrors: { name: "Name is required." }, values: { name } };
  const db = await getDb();
  const { data: old } = await db.from("categories").select("name").eq("id", id).maybeSingle();
  if (!old) return { error: "Category not found.", values: { name } };
  if (old.name === name) return { values: { name } };
  const { error } = await db.from("categories").update({ name }).eq("id", id);
  if (error) {
    if (error.code === "23505")
      return { fieldErrors: { name: "That category already exists." }, values: { name } };
    return { error: "Could not rename category.", values: { name } };
  }
  // Requests store the category by name; keep them in sync.
  await db.from("purchase_requests").update({ category: name }).eq("category", old.name);
  await writeAuditLog({
    action: "update",
    entity_type: "category",
    entity_id: id,
    details: { from: old.name, to: name },
  });
  refresh();
  return { values: { name }, error: undefined, fieldErrors: undefined };
}

export async function deleteCategory(id: string) {
  if (!(await isAdmin())) throw new Error(NOT_ADMIN);
  const db = await getDb();
  const { data: old } = await db.from("categories").select("name").eq("id", id).maybeSingle();
  if (!old) return;
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", entity_type: "category", entity_id: id, details: { name: old.name } });
  refresh();
}
