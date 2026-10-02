"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { parseAmount } from "@/lib/money";
import type { FormState } from "@/lib/db/types";

const ROLES = ["requester", "approver", "admin"];

export async function setUserRole(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const role = String(fd.get("role") ?? "");
  const limitText = String(fd.get("limit") ?? "").trim();
  const values = { role, limit: limitText };
  const me = await getCurrentUser();
  if (!me?.isAdmin) return { error: "Only admins can change roles.", values };
  if (!ROLES.includes(role)) return { error: "Choose a valid role.", values };

  // Only approvers have their own limit; blank means "use the default limit".
  let limit: number | null = null;
  if (role === "approver" && limitText) {
    const p = parseAmount(limitText);
    if (!p.ok) return { fieldErrors: { limit: p.error }, values };
    limit = p.value;
  }

  const db = await getDb();
  const { error } = await db.rpc("set_user_role", { p_user: userId, p_role: role, p_limit: limit });
  if (error) {
    const m = error.message;
    if (m.includes("last_admin")) return { error: "There must be at least one admin.", values };
    if (m.includes("invalid_limit")) return { fieldErrors: { limit: "That approval limit is not allowed. Enter an amount above 0." }, values };
    if (m.includes("forbidden")) return { error: "Only admins can change roles.", values };
    if (m.includes("invalid_role")) return { error: "Choose a valid role.", values };
    if (m.includes("user_not_found")) return { error: "That user no longer exists. Reload the page.", values };
    return { error: "Could not change the role. Please try again.", values };
  }
  revalidatePath("/users");
  revalidatePath("/audit");
  return { values };
}
