import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = "requester" | "approver" | "admin";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  canApprove: boolean;
  isAdmin: boolean;
};

/** Names shown to people: requester is "Staff". */
export const ROLE_LABEL: Record<string, string> = { requester: "Staff", approver: "Approver", admin: "Admin" };

// getUser() asks the auth server for the current record (not just the cached JWT), so a role change by an
// admin shows up on the next page load. The database enforces permissions itself, from its own tables.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const raw = (u.app_metadata as { role?: string } | undefined)?.role;
  const role: Role = raw === "admin" || raw === "approver" ? raw : "requester";
  const email = u.email ?? "";
  const name =
    (u.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() || email.split("@")[0];
  return {
    id: u.id,
    email,
    name,
    role,
    canApprove: role === "approver" || role === "admin",
    isAdmin: role === "admin",
  };
});

/** The signed-in user's approval limit in MYR. null = unlimited; 0 = cannot approve. */
export const getApprovalLimit = cache(async (): Promise<number | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approval_limit_myr");
  if (error) throw new Error(error.message);
  return data === null || data === undefined ? null : Number(data);
});
