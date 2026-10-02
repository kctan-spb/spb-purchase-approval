import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { RoleForm } from "@/features/users/components/RoleForm";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  approval_limit: number | string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

function limitText(role: string, limit: number | null, def: number) {
  if (role === "admin") return limit === null ? "No limit" : `Limit ${formatMoney(limit, "MYR")}`;
  if (role === "approver") return limit === null ? `Default limit ${formatMoney(def, "MYR")}` : `Limit ${formatMoney(limit, "MYR")}`;
  return null;
}

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/");

  const db = await getDb();
  const [{ data, error }, settings] = await Promise.all([db.rpc("list_users"), getSettings()]);
  const users = ((data ?? []) as Row[]).map((u) => ({
    ...u,
    approval_limit: u.approval_limit === null || u.approval_limit === undefined ? null : Number(u.approval_limit),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-1">Users</h1>
      <p className="mb-2 text-sm text-muted">
        Everyone who has signed up. Staff submit requests and see their own. Approvers can also decide on requests up to
        their approval limit. Admins can also manage categories and users.
      </p>
      <p className="mb-5 text-sm text-muted">
        Role and limit changes apply immediately for database access. The person&apos;s screen updates on their next
        page load.
      </p>

      {error ? (
        <div role="alert" className="card border-brand-300 bg-brand-50 p-4 text-sm text-brand-800">
          Could not load users. Please reload the page. If it keeps happening, contact the system administrator.
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {users.map((u) => {
            const lt = limitText(u.role, u.approval_limit, settings.defaultApproverLimitMyr);
            return (
              <li key={u.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words text-ink">
                      {u.full_name || u.email}
                      {u.id === me.id && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-sm break-all text-muted">{u.email}</p>
                    <p className="mt-1 text-sm text-ink">
                      {ROLE_LABEL[u.role] ?? u.role}
                      {lt ? ` · ${lt}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Joined {formatDate(u.created_at)}
                      {u.last_sign_in_at ? ` · last sign-in ${formatDate(u.last_sign_in_at)}` : ""}
                    </p>
                  </div>
                  <RoleForm
                    userId={u.id}
                    role={u.role}
                    limit={u.approval_limit}
                    defaultLimit={settings.defaultApproverLimitMyr}
                    isSelf={u.id === me.id}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
