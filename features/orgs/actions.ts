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

export async function createOrganization(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const values = { name };
  if (name.length < 2 || name.length > 80)
    return { fieldErrors: { name: "Enter a name between 2 and 80 characters." }, values };
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: name });
  if (error || !data) return { error: "Could not create the organization. Please try again.", values };
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
    return bad
      ? { fieldErrors: { code: "That invite code is not valid." }, values }
      : { error: "Could not join the organization. Please try again.", values };
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
