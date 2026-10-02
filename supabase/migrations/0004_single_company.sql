-- 0004: single-company mode. Undoes 0003 (organizations / memberships / org_id) if it was applied,
-- and (re)asserts the 0002 role-based policies. Safe to run whether or not 0003 was ever applied,
-- and safe to re-run. One transaction: all or nothing.
--
-- Roles are in the JWT's app_metadata.role ('approver' | 'admin'; everyone else is a requester).
-- Grant a role (the user must sign in again afterwards):
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--   where email = 'someone@selangorproperties.com.my';

begin;

-- 1. Remove every policy from 0002 and 0003 (they must go before org_id / helper functions can)
drop policy if exists "categories_read" on public.categories;
drop policy if exists "categories_admin_insert" on public.categories;
drop policy if exists "categories_admin_update" on public.categories;
drop policy if exists "categories_admin_delete" on public.categories;
drop policy if exists "requests_select" on public.purchase_requests;
drop policy if exists "requests_insert_own" on public.purchase_requests;
drop policy if exists "requests_update_approver" on public.purchase_requests;
drop policy if exists "approvals_select" on public.approvals;
drop policy if exists "approvals_insert_approver" on public.approvals;
drop policy if exists "audit_select" on public.audit_logs;
drop policy if exists "audit_insert" on public.audit_logs;
drop policy if exists "categories_org_read" on public.categories;
drop policy if exists "categories_org_admin_insert" on public.categories;
drop policy if exists "categories_org_admin_update" on public.categories;
drop policy if exists "categories_org_admin_delete" on public.categories;
drop policy if exists "requests_org_select" on public.purchase_requests;
drop policy if exists "requests_org_insert_own" on public.purchase_requests;
drop policy if exists "requests_org_update_approver" on public.purchase_requests;
drop policy if exists "approvals_org_select" on public.approvals;
drop policy if exists "approvals_org_insert_approver" on public.approvals;
drop policy if exists "audit_org_select" on public.audit_logs;
drop policy if exists "audit_org_insert" on public.audit_logs;

-- 2. Remove the multi-tenant machinery (no-ops if 0003 was never applied)
drop function if exists public.create_organization(text);
drop function if exists public.join_organization(text);
drop function if exists public.get_invite_code(uuid);
drop function if exists public.rotate_invite_code(uuid);
drop function if exists public.set_member_role(uuid, uuid, text);

drop trigger if exists categories_org_immutable on public.categories;
drop trigger if exists purchase_requests_org_immutable on public.purchase_requests;
drop trigger if exists approvals_org_immutable on public.approvals;
drop trigger if exists audit_logs_org_immutable on public.audit_logs;
drop function if exists public.prevent_org_change();

alter table public.approvals drop constraint if exists approvals_request_org_fkey;
alter table public.purchase_requests drop constraint if exists purchase_requests_id_org_key;

drop index if exists public.categories_org_name_key;
drop index if exists public.purchase_requests_org_title_key;
drop index if exists public.purchase_requests_org_idx;
drop index if exists public.approvals_org_idx;
drop index if exists public.audit_logs_org_idx;

alter table public.categories        drop column if exists org_id;
alter table public.purchase_requests drop column if exists org_id;
alter table public.approvals         drop column if exists org_id;
alter table public.audit_logs        drop column if exists org_id;

drop table if exists public.memberships;
drop table if exists public.organizations;

drop function if exists public.is_org_member(uuid);
drop function if exists public.is_org_approver(uuid);
drop function if exists public.is_org_admin(uuid);

-- 3. Global uniqueness again (as in 0001)
create unique index if not exists categories_name_key on public.categories (name);
create unique index if not exists purchase_requests_title_key on public.purchase_requests (title);

-- 4. Role helpers and policies from 0002
create or replace function public.app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'requester')
$$;
create or replace function public.is_approver() returns boolean
language sql stable as $$ select public.app_role() in ('approver', 'admin') $$;
create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.app_role() = 'admin' $$;

create policy "categories_read" on public.categories for select to authenticated using (true);
create policy "categories_admin_insert" on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories_admin_update" on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_delete" on public.categories for delete to authenticated using (public.is_admin());

create policy "requests_select" on public.purchase_requests for select to authenticated
  using (user_id = auth.uid() or public.is_approver());
create policy "requests_insert_own" on public.purchase_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "requests_update_approver" on public.purchase_requests for update to authenticated
  using (public.is_approver()) with check (public.is_approver());

create policy "approvals_select" on public.approvals for select to authenticated
  using (public.is_approver() or exists (
    select 1 from public.purchase_requests r where r.id = approvals.request_id and r.user_id = auth.uid()
  ));
create policy "approvals_insert_approver" on public.approvals for insert to authenticated
  with check (public.is_approver() and user_id = auth.uid());

create policy "audit_select" on public.audit_logs for select to authenticated using (true);
create policy "audit_insert" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

revoke all on public.categories, public.purchase_requests, public.approvals, public.audit_logs from anon;

commit;
