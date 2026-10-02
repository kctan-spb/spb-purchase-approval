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

// Roles live in the JWT's app_metadata (only settable server-side / by an admin),
// which is also what the RLS policies read. A role change needs a fresh login.
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
}
