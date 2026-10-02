import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "requester" | "approver" | "admin";

export const ACTIVE_ORG_COOKIE = "active_org";

export type OrgSummary = { id: string; name: string; role: Role };

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  /** Active organization (null until the user creates/joins one). */
  orgId: string | null;
  orgName: string | null;
  /** Role in the ACTIVE organization (membership); "requester" when there is none. */
  role: Role;
  canApprove: boolean;
  isAdmin: boolean;
  orgs: OrgSummary[];
};

/** A signed-in user that has an active organization. */
export type OrgUser = CurrentUser & { orgId: string; orgName: string };

type OrgRef = { id: string; name: string };
type MembershipRow = {
  org_id: string;
  role: string;
  organizations: OrgRef | OrgRef[] | null;
};

const toRole = (r: string): Role => (r === "admin" || r === "approver" ? r : "requester");

// Roles are per organization and live in the `memberships` table (never in the JWT). The active
// org comes from the `active_org` cookie, validated against the user's memberships (a forged
// cookie can't grant anything; RLS is the real boundary). Memoised per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;

  const { data: rows } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(id, name)")
    .eq("user_id", u.id)
    .order("created_at", { ascending: true });

  const orgs: OrgSummary[] = ((rows ?? []) as unknown as MembershipRow[]).flatMap((m) => {
    const o = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return o ? [{ id: o.id, name: o.name, role: toRole(m.role) }] : [];
  });

  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = orgs.find((o) => o.id === wanted) ?? orgs[0] ?? null;
  const role: Role = active?.role ?? "requester";

  const email = u.email ?? "";
  const name =
    (u.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() || email.split("@")[0];
  return {
    id: u.id,
    email,
    name,
    orgId: active?.id ?? null,
    orgName: active?.name ?? null,
    role,
    canApprove: !!active && (role === "approver" || role === "admin"),
    isAdmin: !!active && role === "admin",
    orgs,
  };
});

/** Signed in AND in an organization, else null (for server actions that return friendly errors). */
export async function getOrgUser(): Promise<OrgUser | null> {
  const u = await getCurrentUser();
  return u && u.orgId ? (u as OrgUser) : null;
}

/** For pages/data access: redirects to /login or /onboarding as needed. */
export async function requireOrgUser(): Promise<OrgUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!u.orgId) redirect("/onboarding");
  return u as OrgUser;
}
