-- Sprint 4: lock it down. Replaces the permissive v1 policies with role-aware RLS.
--
-- Roles live in the JWT's app_metadata.role ('approver' | 'admin'); everyone else is a
-- requester. app_metadata can only be written server-side / via SQL, never by the user.
-- Grant a role (user must sign in again afterwards):
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"approver"}'
--   where email = 'someone@example.com';

create or replace function public.app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'requester')
$$;

create or replace function public.is_approver() returns boolean
language sql stable as $$ select public.app_role() in ('approver', 'admin') $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.app_role() = 'admin' $$;

-- Remove every v1 policy
drop policy if exists "categories_v1_read" on categories;
drop policy if exists "categories_v1_write" on categories;
drop policy if exists "purchase_requests_v1_read" on purchase_requests;
drop policy if exists "purchase_requests_v1_write" on purchase_requests;
drop policy if exists "approvals_v1_read" on approvals;
drop policy if exists "approvals_v1_write" on approvals;
drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;

-- Idempotency for re-runs
drop policy if exists "categories_read" on categories;
drop policy if exists "categories_admin_insert" on categories;
drop policy if exists "categories_admin_update" on categories;
drop policy if exists "categories_admin_delete" on categories;
drop policy if exists "requests_select" on purchase_requests;
drop policy if exists "requests_insert_own" on purchase_requests;
drop policy if exists "requests_update_approver" on purchase_requests;
drop policy if exists "approvals_select" on approvals;
drop policy if exists "approvals_insert_approver" on approvals;
drop policy if exists "audit_select" on audit_logs;
drop policy if exists "audit_insert" on audit_logs;

-- categories: read for all signed-in users, write for admins
create policy "categories_read" on categories for select to authenticated using (true);
create policy "categories_admin_insert" on categories for insert to authenticated with check (public.is_admin());
create policy "categories_admin_update" on categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_delete" on categories for delete to authenticated using (public.is_admin());

-- purchase_requests: requesters see/create their own; approvers/admins see all and decide.
-- No DELETE policy: requests are never deleted by the app.
create policy "requests_select" on purchase_requests for select to authenticated
  using (user_id = auth.uid() or public.is_approver());
create policy "requests_insert_own" on purchase_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "requests_update_approver" on purchase_requests for update to authenticated
  using (public.is_approver()) with check (public.is_approver());

-- approvals: visible with the request; only approvers insert, as themselves. Immutable after.
create policy "approvals_select" on approvals for select to authenticated
  using (public.is_approver() or exists (
    select 1 from purchase_requests r where r.id = approvals.request_id and r.user_id = auth.uid()
  ));
create policy "approvals_insert_approver" on approvals for insert to authenticated
  with check (public.is_approver() and user_id = auth.uid());

-- audit_logs: append-only (no UPDATE/DELETE policies); readable by all signed-in users
create policy "audit_select" on audit_logs for select to authenticated using (true);
create policy "audit_insert" on audit_logs for insert to authenticated with check (user_id = auth.uid());

-- No anonymous access to anything
revoke all on categories, purchase_requests, approvals, audit_logs from anon;
