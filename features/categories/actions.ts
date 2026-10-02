"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/db/types";

// Create and delete are direct writes (admin only by RLS); rename is a database function that also
// updates the requests using the old name. The database writes the audit entries for all three.
const NOT_ADMIN = "Only admins can manage categories.";
const MAX_NAME = 100;
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
  if (name.length > MAX_NAME) return { fieldErrors: { name: "Keep the name under 100 characters." }, values: { name } };
  const db = await getDb();
  const { error } = await db.from("categories").insert({ name });
  if (error) {
    if (error.code === "23505")
      return { fieldErrors: { name: "That category already exists." }, values: { name } };
    return { error: "Could not add category. Please try again.", values: { name } };
  }
  refresh();
  return { values: {} };
}

export async function renameCategory(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!(await isAdmin())) return { error: NOT_ADMIN, values: { name } };
  if (!name) return { fieldErrors: { name: "Name is required." }, values: { name } };
  if (name.length > MAX_NAME) return { fieldErrors: { name: "Keep the name under 100 characters." }, values: { name } };
  const db = await getDb();
  const { error } = await db.rpc("rename_category", { p_id: id, p_name: name });
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate"))
      return { fieldErrors: { name: "That category already exists." }, values: { name } };
    if (error.message.includes("invalid_name"))
      return { fieldErrors: { name: "Enter a valid name (1 to 100 characters)." }, values: { name } };
    if (error.message.includes("forbidden")) return { error: NOT_ADMIN, values: { name } };
    return { error: "Could not rename category. Please try again.", values: { name } };
  }
  refresh();
  return { values: { name }, error: undefined, fieldErrors: undefined };
}

export async function deleteCategory(id: string) {
  if (!(await isAdmin())) throw new Error(NOT_ADMIN);
  const db = await getDb();
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
