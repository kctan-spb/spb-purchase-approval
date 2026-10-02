-- 0003: multi-tenancy. Organizations + per-org memberships; every row is scoped by org_id.
-- See docs/MULTI_TENANT.md. Safe to re-run (idempotent). Runs in ONE transaction: all or nothing.
--
-- Roles move from the JWT's app_metadata.role (global) to memberships.role (per organization).
-- Users can only write memberships/organizations through the SECURITY DEFINER RPCs below.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  slug text not null unique,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'requester' check (role in ('requester', 'approver', 'admin')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- ---------------------------------------------------------------------------------------------
-- 2. org_id on the data tables
-- ---------------------------------------------------------------------------------------------
alter table public.categories        add column if not exists org_id uuid references public.organizations (id);
alter table public.purchase_requests add column if not exists org_id uuid references public.organizations (id);
alter table public.approvals         add column if not exists org_id uuid references public.organizations (id);
alter table public.audit_logs        add column if not exists org_id uuid references public.organizations (id);

-- ---------------------------------------------------------------------------------------------
-- 3. Backfill: one default organization owns all existing rows; existing auth users become
--    members of it (role taken from the old app_metadata.role; everyone else = requester).
--    The user migration only runs when the default org is created by this run (re-run safe).
-- ---------------------------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_new boolean := false;
begin
  select id into v_org from public.organizations where slug = 'selangor-properties';
  if v_org is null then
    insert into public.organizations (name, slug) values ('Selangor Properties', 'selangor-properties')
    returning id into v_org;
    v_new := true;
  end if;

  update public.categories        set org_id = v_org where org_id is null;
  update public.purchase_requests set org_id = v_org where org_id is null;
  update public.approvals         set org_id = v_org where org_id is null;
  update public.audit_logs        set org_id = v_org where org_id is null;

  if v_new then
    insert into public.memberships (org_id, user_id, role)
    select v_org, u.id,
           case
             when u.raw_app_meta_data ->> 'role' = 'admin' then 'admin'
             when u.raw_app_meta_data ->> 'role' = 'approver' then 'approver'
             else 'requester'
           end
    from auth.users u
    on conflict (org_id, user_id) do nothing;
  end if;
end $$;

alter table public.categories        alter column org_id set not null;
alter table public.purchase_requests alter column org_id set not null;
alter table public.approvals         alter column org_id set not null;
alter table public.audit_logs        alter column org_id set not null;

-- ---------------------------------------------------------------------------------------------
-- 4. Per-org uniqueness (replaces the global unique indexes) + lookup indexes
-- ---------------------------------------------------------------------------------------------
drop index if exists public.categories_name_key;
drop index if exists public.purchase_requests_title_key;
create unique index if not exists categories_org_name_key on public.categories (org_id, name);
create unique index if not exists purchase_requests_org_title_key on public.purchase_requests (org_id, title);
create index if not exists purchase_requests_org_idx on public.purchase_requests (org_id, status, created_at desc);
create index if not exists approvals_org_idx on public.approvals (org_id);
create index if not exists audit_logs_org_idx on public.audit_logs (org_id, created_at desc);

-- An approval must belong to the same org as its request (DB-level cross-tenant guard).
-- NOT VALID: enforced for new/changed rows without re-checking legacy rows (which have no FK today).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_requests_id_org_key') then
    alter table public.purchase_requests add constraint purchase_requests_id_org_key unique (id, org_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approvals_request_org_fkey') then
    alter table public.approvals
      add constraint approvals_request_org_fkey
      foreign key (request_id, org_id) references public.purchase_requests (id, org_id) not valid;
  end if;
end $$;

-- org_id is immutable once set (no moving rows between tenants, even for an approver of both).
create or replace function public.prevent_org_change() returns trigger
language plpgsql as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'org_id is immutable';
  end if;
  return new;
end $$;

drop trigger if exists categories_org_immutable on public.categories;
create trigger categories_org_immutable before update on public.categories
  for each row execute function public.prevent_org_change();
drop trigger if exists purchase_requests_org_immutable on public.purchase_requests;
create trigger purchase_requests_org_immutable before update on public.purchase_requests
  for each row execute function public.prevent_org_change();
drop trigger if exists approvals_org_immutable on public.approvals;
create trigger approvals_org_immutable before update on public.approvals
  for each row execute function public.prevent_org_change();
drop trigger if exists audit_logs_org_immutable on public.audit_logs;
create trigger audit_logs_org_immutable before update on public.audit_logs
  for each row execute function public.prevent_org_change();

-- ---------------------------------------------------------------------------------------------
-- 5. Role helpers. SECURITY DEFINER so they can read memberships regardless of its own RLS
--    (avoids policy recursion). search_path pinned; callers cannot influence them.
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.is_org_approver(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role in ('approver', 'admin')
  )
$$;

create or replace function public.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
$$;

revoke all on function public.is_org_member(uuid), public.is_org_approver(uuid), public.is_org_admin(uuid)
  from public, anon;
grant execute on function public.is_org_member(uuid), public.is_org_approver(uuid), public.is_org_admin(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. RLS: drop every 0002 policy, then recreate scoped by org
-- ---------------------------------------------------------------------------------------------
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
-- (also drop any v1 leftovers in case 0002 was never applied)
drop policy if exists "categories_v1_read" on public.categories;
drop policy if exists "categories_v1_write" on public.categories;
drop policy if exists "purchase_requests_v1_read" on public.purchase_requests;
drop policy if exists "purchase_requests_v1_write" on public.purchase_requests;
drop policy if exists "approvals_v1_read" on public.approvals;
drop policy if exists "approvals_v1_write" on public.approvals;
drop policy if exists "audit_logs_v1_read" on public.audit_logs;
drop policy if exists "audit_logs_v1_write" on public.audit_logs;

-- Idempotency for re-runs of this file
drop policy if exists "org_select" on public.organizations;
drop policy if exists "memberships_select" on public.memberships;
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

-- organizations / memberships: read-only for users; all writes go through the RPCs in section 7.
create policy "org_select" on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy "memberships_select" on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_admin(org_id));

-- categories: read for org members, write for org admins
create policy "categories_org_read" on public.categories for select to authenticated
  using (public.is_org_member(org_id));
create policy "categories_org_admin_insert" on public.categories for insert to authenticated
  with check (public.is_org_admin(org_id));
create policy "categories_org_admin_update" on public.categories for update to authenticated
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "categories_org_admin_delete" on public.categories for delete to authenticated
  using (public.is_org_admin(org_id));

-- purchase_requests: requesters see/create their own; approvers/admins see all in the org and decide.
-- No DELETE policy: requests are never deleted by the app.
create policy "requests_org_select" on public.purchase_requests for select to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_org_member(org_id))
    or public.is_org_approver(org_id)
  );
create policy "requests_org_insert_own" on public.purchase_requests for insert to authenticated
  with check (
    public.is_org_member(org_id) and user_id = (select auth.uid()) and status = 'pending'
  );
create policy "requests_org_update_approver" on public.purchase_requests for update to authenticated
  using (public.is_org_approver(org_id)) with check (public.is_org_approver(org_id));

-- approvals: visible with the request; only org approvers insert, as themselves. Immutable after.
create policy "approvals_org_select" on public.approvals for select to authenticated
  using (
    public.is_org_approver(org_id)
    or (
      public.is_org_member(org_id) and exists (
        select 1 from public.purchase_requests r
        where r.id = approvals.request_id and r.org_id = approvals.org_id
          and r.user_id = (select auth.uid())
      )
    )
  );
create policy "approvals_org_insert_approver" on public.approvals for insert to authenticated
  with check (
    public.is_org_approver(org_id) and user_id = (select auth.uid())
    and exists (
      select 1 from public.purchase_requests r
      where r.id = approvals.request_id and r.org_id = approvals.org_id
    )
  );

-- audit_logs: append-only (no UPDATE/DELETE policies); readable by all members of the org
create policy "audit_org_select" on public.audit_logs for select to authenticated
  using (public.is_org_member(org_id));
create policy "audit_org_insert" on public.audit_logs for insert to authenticated
  with check (public.is_org_member(org_id) and user_id = (select auth.uid()));

-- The old global role helpers are gone: nothing may rely on JWT app_metadata any more.
drop function if exists public.is_approver();
drop function if exists public.is_admin();
drop function if exists public.app_role();

-- ---------------------------------------------------------------------------------------------
-- 7. Table privileges. Users never write organizations/memberships directly.
--    invite_code is hidden from plain selects (column-level grant); admins read it via RPC.
-- ---------------------------------------------------------------------------------------------
revoke all on public.organizations, public.memberships from anon, authenticated;
grant select (id, name, slug, created_at) on public.organizations to authenticated;
grant select on public.memberships to authenticated;
revoke all on public.categories, public.purchase_requests, public.approvals, public.audit_logs from anon;

-- ---------------------------------------------------------------------------------------------
-- 8. RPCs (SECURITY DEFINER, search_path pinned, authenticated only)
-- ---------------------------------------------------------------------------------------------

-- Create an organization; the caller becomes its admin. Seeds the default categories.
create or replace function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_org uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name';
  end if;

  v_base := left(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), 40);
  if v_base = '' then v_base := 'org'; end if;
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
  end loop;

  insert into public.organizations (name, slug) values (v_name, v_slug) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'admin');
  insert into public.categories (org_id, user_id, name)
  select v_org, v_uid, c from unnest(array[
    'Office Supplies', 'Software & SaaS', 'Travel & Expenses',
    'Equipment', 'Professional Services', 'Marketing & Advertising'
  ]) as c;
  return v_org;
end $$;

-- Join an organization by invite code; the caller becomes a requester (no-op if already a member).
create or replace function public.join_organization(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select id into v_org from public.organizations
  where invite_code = lower(btrim(coalesce(p_code, '')));
  if v_org is null then raise exception 'invalid_invite_code'; end if;
  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'requester')
  on conflict (org_id, user_id) do nothing;
  return v_org;
end $$;

-- Admin-only: read the invite code.
create or replace function public.get_invite_code(p_org uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_org_admin(p_org) then return null; end if;
  select invite_code into v_code from public.organizations where id = p_org;
  return v_code;
end $$;

-- Admin-only: replace the invite code (invalidates the old one).
create or replace function public.rotate_invite_code(p_org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if not public.is_org_admin(p_org) then raise exception 'forbidden'; end if;
  update public.organizations set invite_code = v_code where id = p_org;
  return v_code;
end $$;

-- Admin-only: change a member's role. Refuses to demote the last admin.
create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_admin(p_org) then raise exception 'forbidden'; end if;
  if p_role not in ('requester', 'approver', 'admin') then raise exception 'invalid_role'; end if;
  if p_role <> 'admin'
     and exists (select 1 from public.memberships where org_id = p_org and user_id = p_user and role = 'admin')
     and (select count(*) from public.memberships where org_id = p_org and role = 'admin') <= 1 then
    raise exception 'last_admin';
  end if;
  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
  if not found then raise exception 'not_a_member'; end if;
end $$;

revoke all on function
  public.create_organization(text), public.join_organization(text), public.get_invite_code(uuid),
  public.rotate_invite_code(uuid), public.set_member_role(uuid, uuid, text)
  from public, anon;
grant execute on function
  public.create_organization(text), public.join_organization(text), public.get_invite_code(uuid),
  public.rotate_invite_code(uuid), public.set_member_role(uuid, uuid, text)
  to authenticated;

commit;

-- =============================================================================================
-- RLS TEST SCRIPT (commented out). Run manually in the SQL editor AFTER applying the migration.
-- It builds throwaway users/orgs, checks isolation, and ends with a deliberate exception so
-- EVERYTHING rolls back. Expected final message: 'TESTS PASSED (rolled back)'.
-- Any other message = a failed assertion. Uncomment from "do $$" to the final "$$;".
-- =============================================================================================
-- do $$
-- declare
--   ua uuid := gen_random_uuid();  -- admin of org1
--   ub uuid := gen_random_uuid();  -- requester of org1
--   uc uuid := gen_random_uuid();  -- admin of org2
--   ud uuid := gen_random_uuid();  -- approver of org1
--   o1 uuid; o2 uuid; req1 uuid; req2 uuid; n int; ok boolean; code text;
-- begin
--   -- fixtures (as the table owner; bypasses RLS)
--   insert into auth.users (id, email) values
--     (ua, 'a@t.test'), (ub, 'b@t.test'), (uc, 'c@t.test'), (ud, 'd@t.test');
--   insert into public.organizations (name, slug) values ('Org One', 'org-one-test') returning id into o1;
--   insert into public.organizations (name, slug) values ('Org Two', 'org-two-test') returning id into o2;
--   insert into public.memberships (org_id, user_id, role) values
--     (o1, ua, 'admin'), (o1, ub, 'requester'), (o1, ud, 'approver'), (o2, uc, 'admin');
--   insert into public.categories (org_id, name) values (o1, 'Cat1'), (o2, 'Cat2');
--   insert into public.purchase_requests (org_id, user_id, title, description, amount)
--     values (o1, ub, 'B req', 'x', 10) returning id into req1;
--   insert into public.purchase_requests (org_id, user_id, title, description, amount)
--     values (o2, uc, 'C req', 'x', 10) returning id into req2;
--
--   set local role authenticated;
--
--   -- ===== B (requester, org1)
--   perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
--   select count(*) into n from public.purchase_requests;
--   if n <> 1 then raise exception 'FAIL B should see exactly 1 request, saw %', n; end if;
--   select count(*) into n from public.purchase_requests where org_id = o2;
--   if n <> 0 then raise exception 'FAIL B sees org2 requests'; end if;
--   select count(*) into n from public.categories;
--   if n <> 1 then raise exception 'FAIL B should see only org1 categories, saw %', n; end if;
--   -- B can create own request in org1
--   insert into public.purchase_requests (org_id, user_id, title, description, amount)
--     values (o1, ub, 'B req 2', 'x', 5);
--   -- B cannot create in org2
--   ok := false;
--   begin
--     insert into public.purchase_requests (org_id, user_id, title, description, amount)
--       values (o2, ub, 'sneaky', 'x', 5);
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL B inserted into org2'; end if;
--   -- B cannot impersonate another user
--   ok := false;
--   begin
--     insert into public.purchase_requests (org_id, user_id, title, description, amount)
--       values (o1, ua, 'imp', 'x', 5);
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL B impersonated A'; end if;
--   -- B cannot approve, cannot write categories
--   ok := false;
--   begin
--     insert into public.approvals (org_id, user_id, request_id, decision) values (o1, ub, req1, 'approved');
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL requester approved'; end if;
--   ok := false;
--   begin
--     insert into public.categories (org_id, name) values (o1, 'Nope');
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL requester wrote category'; end if;
--   -- B cannot read the invite code column or the RPC value
--   ok := false;
--   begin
--     perform invite_code from public.organizations;
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL invite_code column readable'; end if;
--   if public.get_invite_code(o1) is not null then raise exception 'FAIL non-admin got invite code'; end if;
--   -- B cannot change roles
--   ok := false;
--   begin perform public.set_member_role(o1, ub, 'admin');
--   exception when others then ok := true; end;
--   if not ok then raise exception 'FAIL requester promoted self'; end if;
--   -- B cannot move org via update (needs approver anyway -> 0 rows)
--   update public.purchase_requests set status = 'approved' where id = req1;
--   get diagnostics n = row_count;
--   if n <> 0 then raise exception 'FAIL requester updated request'; end if;
--
--   -- ===== D (approver, org1)
--   perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
--   select count(*) into n from public.purchase_requests;
--   if n <> 2 then raise exception 'FAIL approver should see 2 org1 requests, saw %', n; end if;
--   insert into public.approvals (org_id, user_id, request_id, decision) values (o1, ud, req1, 'approved');
--   update public.purchase_requests set status = 'approved' where id = req1;
--   get diagnostics n = row_count;
--   if n <> 1 then raise exception 'FAIL approver could not update'; end if;
--   -- approver cannot approve another org's request (cross-org request_id)
--   ok := false;
--   begin
--     insert into public.approvals (org_id, user_id, request_id, decision) values (o1, ud, req2, 'approved');
--   exception when insufficient_privilege or foreign_key_violation then ok := true; end;
--   if not ok then raise exception 'FAIL cross-org approval'; end if;
--   -- org_id is immutable
--   ok := false;
--   begin
--     update public.purchase_requests set org_id = o2 where id = req1;
--   exception when others then ok := true; end;
--   if not ok then raise exception 'FAIL org_id changed'; end if;
--   -- audit: append-only
--   insert into public.audit_logs (org_id, user_id, action, entity_type, entity_id)
--     values (o1, ud, 'approve', 'purchase_request', req1);
--   update public.audit_logs set action = 'x';
--   get diagnostics n = row_count;
--   if n <> 0 then raise exception 'FAIL audit updatable'; end if;
--   delete from public.audit_logs;
--   get diagnostics n = row_count;
--   if n <> 0 then raise exception 'FAIL audit deletable'; end if;
--   -- audit insert into another org is blocked
--   ok := false;
--   begin
--     insert into public.audit_logs (org_id, user_id, action, entity_type) values (o2, ud, 'create', 'x');
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL audit cross-org insert'; end if;
--
--   -- ===== C (admin, org2): sees nothing of org1
--   perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
--   select count(*) into n from public.purchase_requests where org_id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 requests'; end if;
--   select count(*) into n from public.approvals where org_id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 approvals'; end if;
--   select count(*) into n from public.audit_logs where org_id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 audit'; end if;
--   select count(*) into n from public.categories where org_id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 categories'; end if;
--   select count(*) into n from public.organizations where id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 row'; end if;
--   select count(*) into n from public.memberships where org_id = o1;
--   if n <> 0 then raise exception 'FAIL C sees org1 memberships'; end if;
--   -- C is admin of org2 only: cannot write org1 categories
--   ok := false;
--   begin
--     insert into public.categories (org_id, name) values (o1, 'Hijack');
--   exception when insufficient_privilege then ok := true; end;
--   if not ok then raise exception 'FAIL C wrote org1 category'; end if;
--   update public.categories set name = 'Hijacked' where org_id = o1;
--   get diagnostics n = row_count;
--   if n <> 0 then raise exception 'FAIL C updated org1 category'; end if;
--   delete from public.categories where org_id = o1;
--   get diagnostics n = row_count;
--   if n <> 0 then raise exception 'FAIL C deleted org1 category'; end if;
--   -- C can read its own org's invite code; wrong org returns null
--   if public.get_invite_code(o2) is null then raise exception 'FAIL admin cannot read invite code'; end if;
--   if public.get_invite_code(o1) is not null then raise exception 'FAIL C read org1 invite code'; end if;
--   -- same category name is fine in another org (per-org uniqueness)
--   insert into public.categories (org_id, name) values (o2, 'Cat1');
--
--   -- ===== RPCs: create + join
--   perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
--   o2 := public.create_organization('B Own Org');
--   select count(*) into n from public.memberships where org_id = o2 and user_id = ub and role = 'admin';
--   if n <> 1 then raise exception 'FAIL create_organization did not make caller admin'; end if;
--   select count(*) into n from public.categories where org_id = o2;
--   if n <> 6 then raise exception 'FAIL default categories not seeded'; end if;
--   code := public.get_invite_code(o2);
--   perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
--   if public.join_organization(code) <> o2 then raise exception 'FAIL join returned wrong org'; end if;
--   select count(*) into n from public.memberships where org_id = o2 and user_id = uc and role = 'requester';
--   if n <> 1 then raise exception 'FAIL join did not make caller requester'; end if;
--   ok := false;
--   begin perform public.join_organization('not-a-code');
--   exception when others then ok := true; end;
--   if not ok then raise exception 'FAIL bad invite code accepted'; end if;
--
--   reset role;
--   raise exception 'TESTS PASSED (rolled back)';
-- end $$;
