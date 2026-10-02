import { Sidebar } from "@/components/shell/Sidebar";
import { requireOrgUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /login (signed out) or /onboarding (no organization yet).
  const user = await requireOrgUser();

  // Invite code is hidden from plain selects; only admins get it, via RPC.
  let inviteCode: string | null = null;
  if (user.isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_invite_code", { p_org: user.orgId });
    inviteCode = typeof data === "string" ? data : null;
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        user={{ name: user.name, email: user.email, role: user.role, canApprove: user.canApprove }}
        org={{ id: user.orgId, name: user.orgName, inviteCode }}
        orgs={user.orgs.map((o) => ({ id: o.id, name: o.name }))}
      />
      <main className="min-w-0 flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">
        {children}
      </main>
    </div>
  );
}
