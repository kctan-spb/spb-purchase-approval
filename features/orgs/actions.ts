"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/db/types";

async function setActiveOrg(orgId: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Turns a database error into something actionable. "Function not found" (PGRST202 / 42883) means
// the multi-tenant migration (0003) has not been applied to this database yet.
function rpcErrorMessage(action: string, code?: string, message?: string) {
  if (code === "PGRST202" || code === "42883" || /schema cache|does not exist/i.test(message ?? ""))
    return `Could not ${action}: the database has not been updated yet (migration 0003 is missing). Ask the administrator to apply it.`;
  if (message?.includes("not_authenticated")) return "Your session has expired. Please sign in again.";
  return `Could not ${action}. Please try again.${code ? ` (error ${code})` : ""}`;
}

export async function createOrganization(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const values = { name };
  if (name.length < 2 || name.length > 80)
    return { fieldErrors: { name: "Enter a name between 2 and 80 characters." }, values };
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: name });
  if (error || !data) {
    console.error("create_organization failed", { code: error?.code, message: error?.message, user: user.id });
    return { error: rpcErrorMessage("create the organization", error?.code, error?.message), values };
  }
  await setActiveOrg(data as string);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function joinOrganization(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = String(fd.get("code") ?? "").trim();
  const values = { code };
  if (!code) return { fieldErrors: { code: "Enter an invite code." }, values };
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_organization", { p_code: code });
  if (error || !data) {
    const bad = error?.message?.includes("invalid_invite_code");
    if (!bad) console.error("join_organization failed", { code: error?.code, message: error?.message, user: user.id });
    return bad
      ? { fieldErrors: { code: "That invite code is not valid." }, values }
      : { error: rpcErrorMessage("join the organization", error?.code, error?.message), values };
  }
  await setActiveOrg(data as string);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function switchOrganization(fd: FormData) {
  const orgId = String(fd.get("orgId") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Only switch to an org the user is a member of (RLS enforces this regardless).
  if (user.orgs.some((o) => o.id === orgId)) await setActiveOrg(orgId);
  revalidatePath("/", "layout");
  redirect("/");
}
