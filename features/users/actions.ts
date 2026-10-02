"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/db/types";

const ROLES = ["requester", "approver", "admin"];

export async function setUserRole(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const role = String(fd.get("role") ?? "");
  const me = await getCurrentUser();
  if (!me?.isAdmin) return { error: "Only admins can change roles." };
  if (!ROLES.includes(role)) return { error: "Choose a valid role." };

  const db = await getDb();
  const { error } = await db.rpc("set_user_role", { p_user: userId, p_role: role });
  if (error) {
    if (error.message.includes("last_admin")) return { error: "There must be at least one admin." };
    if (error.message.includes("forbidden")) return { error: "Only admins can change roles." };
    if (error.code === "PGRST202")
      return { error: "The database is missing migration 0005 (user administration)." };
    return { error: "Could not change the role. Please try again." };
  }
  revalidatePath("/users");
  revalidatePath("/audit");
  return { values: { role } };
}
