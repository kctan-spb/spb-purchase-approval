import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { RoleForm } from "@/features/users/components/RoleForm";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/");

  const db = await getDb();
  const { data, error } = await db.rpc("list_users");
  const users = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold sm:text-2xl">Users</h1>
      <p className="mb-5 text-sm text-slate-500">
        Everyone who has signed up. Requesters submit and see their own requests, approvers also decide on all
        requests, and admins also manage categories and users. A changed role applies after the person signs out
        and back in.
      </p>

      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.code === "PGRST202"
            ? "The database is missing migration 0005 (user administration). Apply it, then reload."
            : "Could not load users. Please try again."}
          <p className="mt-2 text-xs break-words text-rose-600">
            Details: {error.code} {error.message}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {u.full_name || u.email}
                    {u.id === me.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                  </p>
                  <p className="text-sm break-all text-slate-600">{u.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Joined {formatDate(u.created_at)}
                    {u.last_sign_in_at ? ` · last sign-in ${formatDate(u.last_sign_in_at)}` : ""}
                  </p>
                </div>
                <RoleForm userId={u.id} role={u.role} isSelf={u.id === me.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
