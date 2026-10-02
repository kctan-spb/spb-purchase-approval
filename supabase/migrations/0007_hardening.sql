-- 0007: control hardening (self-test included).
--
-- What this does
--  * Approvals are made ONLY through decide_request(): atomic (approval + status + audit in one step),
--    self-approval blocked, per-approver limit in MYR, comment rules, race-safe.
--  * Audit rows are written ONLY by database triggers/functions (cannot be forged by users);
--    audit_logs and approvals are append-only; request fields are immutable after submission.
--  * Roles/limits are read from the database on every check (no stale-JWT window).
--  * Audit visibility: approvers/admins see everything, requesters only their own history.
--  * Currency: default MYR, amount_myr equivalent, strict amount/length limits, unique title dropped.
--  * Attachments: private storage bucket + request_attachments table.
--  * Admin user management gains an approval limit per approver.
--
-- Settings (change with SQL: update app_settings set value = '...' where key = '...'):
--   default_approver_limit_myr   10000   approvers' limit unless set per person (admins: unlimited)
--   comment_required_over_myr    10000   approvals at/above this need a comment
--   attachment_required_over_myr  5000   requests at/above this need a quote/invoice (enforced by the app)
--   allow_self_approval           false  set to 'true' ONLY for solo testing, then back to 'false'
--
-- One transaction, and it tests itself at the end: if ANY check fails the whole script rolls back and
-- nothing changes. The test users it creates are rolled back too.

begin;

-- 0. Drop guards while we backfill (re-run safety)
drop trigger if exists pr_guard on public.purchase_requests;
drop trigger if exists approvals_append_only on public.approvals;
drop trigger if exists audit_logs_append_only on public.audit_logs;

-- 1. Settings --------------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings (key, value) values
  ('default_approver_limit_myr', '10000'),
  ('comment_required_over_myr', '10000'),
  ('attachment_required_over_myr', '5000'),
  ('allow_self_approval', 'false')
on conflict (key) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists "settings_read" on public.app_settings;
create policy "settings_read" on public.app_settings for select to authenticated using (true);
revoke all on public.app_settings from anon;
revoke insert, update, delete, truncate on public.app_settings from authenticated;

create or replace function public.setting_text(p_key text, p_default text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = p_key), p_default)
$$;
create or replace function public.setting_numeric(p_key text, p_default numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(value, '')::numeric from public.app_settings where key = p_key), p_default)
$$;

-- 2. Roles read from the database (never from a possibly stale token) --------------------------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce((select u.raw_app_meta_data ->> 'role' from auth.users u where u.id = auth.uid()), 'requester')
$$;
create or replace function public.is_approver() returns boolean
language sql stable as $$ select public.app_role() in ('approver', 'admin') $$;
create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.app_role() = 'admin' $$;

-- Approval limit in MYR for the signed-in user. NULL = unlimited; 0 = cannot approve.
create or replace function public.approval_limit_myr() returns numeric
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_meta jsonb;
  v_role text;
begin
  select u.raw_app_meta_data into v_meta from auth.users u where u.id = auth.uid();
  v_role := coalesce(v_meta ->> 'role', 'requester');
  if v_role not in ('approver', 'admin') then
    return 0;
  end if;
  if nullif(v_meta ->> 'approval_limit', '') is not null then
    return (v_meta ->> 'approval_limit')::numeric;
  end if;
  if v_role = 'admin' then
    return null;
  end if;
  return public.setting_numeric('default_approver_limit_myr', 10000);
end $$;

-- 3. Columns, limits, constraints --------------------------------------------------------------
alter table public.purchase_requests alter column amount type numeric(14,2);
alter table public.purchase_requests alter column currency set default 'MYR';
alter table public.purchase_requests add column if not exists amount_myr numeric(14,2);
alter table public.purchase_requests add column if not exists requester_name text;
alter table public.purchase_requests add column if not exists requester_email text;

update public.purchase_requests set amount_myr = amount where currency = 'MYR' and amount_myr is null;
update public.purchase_requests r
set requester_name = coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
    requester_email = u.email
from auth.users u
where u.id = r.user_id and r.requester_name is null;

alter table public.approvals add column if not exists approver_name text;
alter table public.approvals add column if not exists approver_email text;
update public.approvals a
set approver_name = coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
    approver_email = u.email
from auth.users u
where u.id = a.user_id and a.approver_name is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pr_amount_ck') then
    alter table public.purchase_requests add constraint pr_amount_ck
      check (amount > 0 and amount <= 999999999.99);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pr_amount_myr_ck') then
    alter table public.purchase_requests add constraint pr_amount_myr_ck
      check (amount_myr is null or (amount_myr > 0 and amount_myr <= 999999999.99));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pr_currency_ck') then
    alter table public.purchase_requests add constraint pr_currency_ck
      check (currency in ('MYR', 'USD', 'SGD', 'EUR', 'GBP'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pr_status_ck') then
    alter table public.purchase_requests add constraint pr_status_ck
      check (status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pr_text_ck') then
    alter table public.purchase_requests add constraint pr_text_ck
      check (char_length(title) between 1 and 200
         and char_length(description) between 1 and 4000
         and (vendor is null or char_length(vendor) <= 200)
         and (category is null or char_length(category) <= 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ap_decision_ck') then
    alter table public.approvals add constraint ap_decision_ck check (decision in ('approved', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ap_comment_ck') then
    alter table public.approvals add constraint ap_comment_ck check (comment is null or char_length(comment) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ap_request_fk') then
    alter table public.approvals add constraint ap_request_fk
      foreign key (request_id) references public.purchase_requests (id);
  end if;
end $$;

-- Duplicate titles are allowed (recurring payments); duplicates are a warning, not a block.
drop index if exists public.purchase_requests_title_key;
create index if not exists purchase_requests_user_idx on public.purchase_requests (user_id, created_at desc);

-- 4. Attachments -------------------------------------------------------------------------------
create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  path text not null unique,
  filename text not null check (char_length(filename) between 1 and 255),
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 4194304),
  created_at timestamptz not null default now()
);
create index if not exists request_attachments_request_idx on public.request_attachments (request_id);
alter table public.request_attachments enable row level security;

drop policy if exists "att_select" on public.request_attachments;
drop policy if exists "att_insert" on public.request_attachments;
create policy "att_select" on public.request_attachments for select to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = request_attachments.request_id));
create policy "att_insert" on public.request_attachments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.purchase_requests r
      where r.id = request_attachments.request_id and r.user_id = auth.uid() and r.status = 'pending'
    )
  );
revoke all on public.request_attachments from anon;
revoke update, delete, truncate on public.request_attachments from authenticated;
grant select, insert on public.request_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 4194304,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attachments_insert_own" on storage.objects;
drop policy if exists "attachments_read" on storage.objects;
create policy "attachments_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments_read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_approver()));

-- 5. Audit + integrity triggers -----------------------------------------------------------------
create or replace function public.pr_before_insert() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
  v_name text;
begin
  if auth.uid() is not null then
    select u.email, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
      into v_email, v_name
    from auth.users u where u.id = auth.uid();
    new.user_id := auth.uid();
    new.status := 'pending';
    new.requester_name := v_name;
    new.requester_email := v_email;
    if new.currency = 'MYR' then
      new.amount_myr := new.amount;
    elsif new.amount_myr is null then
      raise exception 'amount_myr_required';
    end if;
  end if;
  return new;
end $$;

create or replace function public.pr_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'create', 'purchase_request', new.id, jsonb_build_object(
    'amount', new.amount, 'currency', new.currency, 'amount_myr', new.amount_myr,
    'category', new.category, 'vendor', new.vendor, 'routine', new.routine,
    'requested_by', new.requester_name));
  return null;
end $$;

create or replace function public.pr_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.amount is distinct from old.amount
     or new.currency is distinct from old.currency
     or new.amount_myr is distinct from old.amount_myr
     or new.vendor is distinct from old.vendor
     or new.routine is distinct from old.routine
     or new.created_at is distinct from old.created_at
     or new.requester_name is distinct from old.requester_name
     or new.requester_email is distinct from old.requester_email then
    raise exception 'request_immutable: submitted requests cannot be edited';
  end if;
  if new.status is distinct from old.status then
    if not (old.status = 'pending' and new.status in ('approved', 'rejected')
            and coalesce(current_setting('app.deciding', true), '') = '1') then
      raise exception 'status_change_not_allowed: decisions are made with decide_request()';
    end if;
  end if;
  if new.category is distinct from old.category
     and coalesce(current_setting('app.renaming', true), '') <> '1' then
    raise exception 'category_change_not_allowed: rename categories with rename_category()';
  end if;
  return new;
end $$;

create or replace function public.forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception 'append_only: % on % is not allowed', tg_op, tg_table_name;
end $$;

create or replace function public.categories_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'create', 'category', new.id, jsonb_build_object('name', new.name));
  elsif tg_op = 'UPDATE' then
    if new.name is distinct from old.name then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
      values (auth.uid(), 'update', 'category', new.id, jsonb_build_object('from', old.name, 'to', new.name));
    end if;
  else
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'delete', 'category', old.id, jsonb_build_object('name', old.name));
  end if;
  return null;
end $$;

drop trigger if exists pr_before_insert on public.purchase_requests;
create trigger pr_before_insert before insert on public.purchase_requests
  for each row execute function public.pr_before_insert();
drop trigger if exists pr_after_insert on public.purchase_requests;
create trigger pr_after_insert after insert on public.purchase_requests
  for each row execute function public.pr_after_insert();
create trigger pr_guard before update on public.purchase_requests
  for each row execute function public.pr_guard();
create trigger approvals_append_only before update or delete on public.approvals
  for each row execute function public.forbid_change();
create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function public.forbid_change();
drop trigger if exists categories_audit_t on public.categories;
create trigger categories_audit_t after insert or update or delete on public.categories
  for each row execute function public.categories_audit();

revoke all on function public.pr_before_insert(), public.pr_after_insert(), public.pr_guard(),
  public.forbid_change(), public.categories_audit() from public, anon, authenticated;

-- 6. Policies and privileges ---------------------------------------------------------------------
-- (leftover v1 demo policies, in case 0002 was never applied)
drop policy if exists "categories_v1_read" on public.categories;
drop policy if exists "categories_v1_write" on public.categories;
drop policy if exists "purchase_requests_v1_read" on public.purchase_requests;
drop policy if exists "purchase_requests_v1_write" on public.purchase_requests;
drop policy if exists "approvals_v1_read" on public.approvals;
drop policy if exists "approvals_v1_write" on public.approvals;
drop policy if exists "audit_logs_v1_read" on public.audit_logs;
drop policy if exists "audit_logs_v1_write" on public.audit_logs;
drop policy if exists "requests_update_approver" on public.purchase_requests;
drop policy if exists "approvals_insert_approver" on public.approvals;
drop policy if exists "audit_select" on public.audit_logs;
drop policy if exists "audit_insert" on public.audit_logs;

create policy "audit_select" on public.audit_logs for select to authenticated
  using (
    public.is_approver()
    or user_id = auth.uid()
    or exists (select 1 from public.purchase_requests r where r.id = audit_logs.entity_id and r.user_id = auth.uid())
  );

revoke update, delete, truncate on public.purchase_requests from authenticated, anon;
revoke insert, update, delete, truncate on public.approvals from authenticated, anon;
revoke insert, update, delete, truncate on public.audit_logs from authenticated, anon;

-- 7. Functions the app calls -----------------------------------------------------------------------
create or replace function public.decide_request(p_request uuid, p_decision text, p_comment text)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  r public.purchase_requests%rowtype;
  v_comment text := btrim(coalesce(p_comment, ''));
  v_limit numeric;
  v_need numeric;
  v_name text;
  v_email text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_approver() then raise exception 'forbidden'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'invalid_decision'; end if;
  if char_length(v_comment) > 2000 then raise exception 'comment_too_long'; end if;

  select * into r from public.purchase_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'pending' then raise exception 'already_decided'; end if;
  if r.user_id = v_uid and public.setting_text('allow_self_approval', 'false') <> 'true' then
    raise exception 'self_approval';
  end if;

  if p_decision = 'rejected' and v_comment = '' then raise exception 'comment_required'; end if;
  if p_decision = 'approved' then
    v_limit := public.approval_limit_myr();
    if v_limit is not null and (r.amount_myr is null or r.amount_myr > v_limit) then
      raise exception 'over_limit';
    end if;
    v_need := public.setting_numeric('comment_required_over_myr', 10000);
    if v_comment = '' and (r.amount_myr is null or r.amount_myr >= v_need) then
      raise exception 'comment_required';
    end if;
  end if;

  select u.email, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
    into v_email, v_name
  from auth.users u where u.id = v_uid;

  insert into public.approvals (request_id, decision, comment, user_id, approver_name, approver_email)
  values (p_request, p_decision, nullif(v_comment, ''), v_uid, v_name, v_email);

  perform set_config('app.deciding', '1', true);
  update public.purchase_requests set status = p_decision where id = p_request;
  perform set_config('app.deciding', '0', true);

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (v_uid, case when p_decision = 'approved' then 'approve' else 'reject' end,
          'purchase_request', p_request,
          jsonb_build_object('decision', p_decision, 'comment', nullif(v_comment, ''),
                             'approver', v_name, 'approver_email', v_email, 'amount_myr', r.amount_myr));
end $$;

create or replace function public.rename_category(p_id uuid, p_name text)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_old text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 100 then raise exception 'invalid_name'; end if;
  select name into v_old from public.categories where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_old = v_name then return; end if;
  update public.categories set name = v_name where id = p_id;
  perform set_config('app.renaming', '1', true);
  update public.purchase_requests set category = v_name where category = v_old;
  perform set_config('app.renaming', '0', true);
end $$;

create or replace function public.log_export(p_type text, p_rows integer, p_timeframe text, p_status text, p_category text)
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_type not in ('requests', 'audit') then raise exception 'invalid_type'; end if;
  if p_type = 'audit' and not public.is_approver() then raise exception 'forbidden'; end if;
  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'export', 'export', null, jsonb_build_object(
    'export', p_type, 'rows', p_rows, 'timeframe', p_timeframe, 'status', p_status, 'category', p_category));
end $$;

create or replace function public.request_summary(p_from timestamptz default null, p_to timestamptz default null)
returns table (status text, currency text, n bigint, total numeric, total_myr numeric)
language sql stable set search_path = public as $$
  select r.status, r.currency, count(*), coalesce(sum(r.amount), 0), coalesce(sum(r.amount_myr), 0)
  from public.purchase_requests r
  where (p_from is null or r.created_at >= p_from) and (p_to is null or r.created_at < p_to)
  group by r.status, r.currency
$$;

drop function if exists public.list_users();
create function public.list_users()
returns table (id uuid, email text, full_name text, role text, approval_limit numeric,
               created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_user_meta_data ->> 'full_name', '')::text,
           coalesce(u.raw_app_meta_data ->> 'role', 'requester')::text,
           nullif(u.raw_app_meta_data ->> 'approval_limit', '')::numeric,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    order by u.created_at;
end $$;

drop function if exists public.set_user_role(uuid, text);
create or replace function public.set_user_role(p_user uuid, p_role text, p_limit numeric default null)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_meta jsonb;
  v_old_role text;
  v_old_limit numeric;
  v_limit numeric := p_limit;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('requester', 'approver', 'admin') then raise exception 'invalid_role'; end if;
  if v_limit is not null and (v_limit < 0 or v_limit > 999999999.99) then raise exception 'invalid_limit'; end if;
  if p_role = 'requester' then v_limit := null; end if;

  -- Serialise role changes so two admins cannot demote each other at the same instant.
  perform 1 from auth.users where raw_app_meta_data ->> 'role' = 'admin' for update;

  select coalesce(u.raw_app_meta_data, '{}'::jsonb) into v_meta from auth.users u where u.id = p_user;
  if not found then raise exception 'user_not_found'; end if;
  v_old_role := coalesce(v_meta ->> 'role', 'requester');
  v_old_limit := nullif(v_meta ->> 'approval_limit', '')::numeric;

  if v_old_role = 'admin' and p_role <> 'admin'
     and (select count(*) from auth.users where raw_app_meta_data ->> 'role' = 'admin') <= 1 then
    raise exception 'last_admin';
  end if;

  v_meta := v_meta - 'role' - 'approval_limit';
  if p_role <> 'requester' then v_meta := v_meta || jsonb_build_object('role', p_role); end if;
  if v_limit is not null then v_meta := v_meta || jsonb_build_object('approval_limit', v_limit); end if;
  update auth.users set raw_app_meta_data = v_meta where id = p_user;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'update', 'user', p_user, jsonb_build_object(
    'role_from', v_old_role, 'role_to', p_role, 'limit_from', v_old_limit, 'limit_to', v_limit));
end $$;

revoke all on function
  public.setting_text(text, text), public.setting_numeric(text, numeric), public.approval_limit_myr(),
  public.decide_request(uuid, text, text), public.rename_category(uuid, text),
  public.log_export(text, integer, text, text, text), public.request_summary(timestamptz, timestamptz),
  public.list_users(), public.set_user_role(uuid, text, numeric)
  from public, anon;
grant execute on function
  public.setting_text(text, text), public.setting_numeric(text, numeric), public.approval_limit_myr(),
  public.decide_request(uuid, text, text), public.rename_category(uuid, text),
  public.log_export(text, integer, text, text, text), public.request_summary(timestamptz, timestamptz),
  public.list_users(), public.set_user_role(uuid, text, numeric)
  to authenticated;

-- 8. Self-test. Any failed check raises an error, which rolls back this whole script. ----------------
do $selftest$
declare
  ua uuid := gen_random_uuid();   -- requester
  ub uuid := gen_random_uuid();   -- requester
  uc uuid := gen_random_uuid();   -- approver (default limit)
  ud uuid := gen_random_uuid();   -- admin
  ue uuid := gen_random_uuid();   -- approver, limit 500
  ra uuid := gen_random_uuid();   -- A small request
  rb uuid := gen_random_uuid();   -- B request
  rbig uuid := gen_random_uuid(); -- A big request (20000)
  rbig2 uuid := gen_random_uuid();
  rmid uuid := gen_random_uuid(); -- A request of 600 in 'Selftest cat'
  rc uuid := gen_random_uuid();   -- C's own request
  cat uuid;
  n int; ok boolean; lim numeric; c text;
begin
  begin  -- sub-transaction: everything inside is rolled back when TESTS_OK is raised at the end
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
      (ua, 'ta@selangorproperties.com.my', '{}', '{"full_name":"Test A"}'),
      (ub, 'tb@selangorproperties.com.my', '{}', '{"full_name":"Test B"}'),
      (uc, 'tc@selangorproperties.com.my', '{"role":"approver"}', '{"full_name":"Test C"}'),
      (ud, 'td@selangorproperties.com.my', '{"role":"admin"}', '{"full_name":"Test D"}'),
      (ue, 'te@selangorproperties.com.my', '{"role":"approver","approval_limit":500}', '{"full_name":"Test E"}');
    insert into public.categories (name) values ('Selftest cat') returning id into cat;

    -- ===== requester A
    perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.purchase_requests (id, user_id, title, description, amount, currency, status)
      values (ra, ub, 'A small', 'x', 100, 'MYR', 'approved');
    select count(*) into n from public.purchase_requests
      where id = ra and user_id = ua and status = 'pending' and requester_name = 'Test A' and amount_myr = 100;
    if n <> 1 then raise exception 'FAIL insert did not force owner/status/name'; end if;

    ok := false;
    begin
      insert into public.purchase_requests (id, title, description, amount, currency)
        values (gen_random_uuid(), 'usd no myr', 'x', 100, 'USD');
    exception when others then ok := sqlerrm like '%amount_myr_required%'; end;
    if not ok then raise exception 'FAIL non-MYR request without amount_myr accepted'; end if;

    ok := false;
    begin
      insert into public.purchase_requests (id, title, description, amount) values (gen_random_uuid(), 'neg', 'x', -5);
    exception when check_violation then ok := true; end;
    if not ok then raise exception 'FAIL negative amount accepted'; end if;

    insert into public.purchase_requests (id, title, description, amount) values (rbig, 'A big', 'x', 20000);
    insert into public.purchase_requests (id, title, description, amount) values (rbig2, 'A big 2', 'x', 20000);
    insert into public.purchase_requests (id, title, description, amount, category) values (rmid, 'A mid', 'x', 600, 'Selftest cat');
    insert into public.purchase_requests (id, title, description, amount) values (gen_random_uuid(), 'A small', 'duplicate title is fine', 5);

    ok := false;
    begin update public.purchase_requests set status = 'approved' where id = ra;
    exception when insufficient_privilege then ok := true; end;
    if not ok then raise exception 'FAIL requester could update a request'; end if;

    ok := false;
    begin insert into public.approvals (request_id, decision, user_id) values (ra, 'approved', ua);
    exception when insufficient_privilege then ok := true; end;
    if not ok then raise exception 'FAIL requester inserted an approval'; end if;

    ok := false;
    begin insert into public.audit_logs (user_id, action, entity_type, entity_id) values (ua, 'approve', 'purchase_request', ra);
    exception when insufficient_privilege then ok := true; end;
    if not ok then raise exception 'FAIL requester forged an audit row'; end if;

    select count(*) into n from public.audit_logs where entity_id = ra and action = 'create';
    if n <> 1 then raise exception 'FAIL create audit row missing, saw %', n; end if;

    ok := false;
    begin perform public.decide_request(ra, 'approved', 'x');
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL requester could call decide_request'; end if;

    ok := false;
    begin perform * from public.list_users();
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL requester could list users'; end if;

    ok := false;
    begin perform public.set_user_role(ua, 'admin');
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL requester could change roles'; end if;

    ok := false;
    begin perform public.rename_category(cat, 'Hacked');
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL requester could rename a category'; end if;

    ok := false;
    begin perform public.log_export('audit', 1, 'x', null, null);
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL requester could log an audit export'; end if;
    perform public.log_export('requests', 1, 'All time', null, null);

    insert into public.request_attachments (request_id, user_id, path, filename, content_type, size_bytes)
      values (ra, ua, ua || '/' || ra || '/f.pdf', 'f.pdf', 'application/pdf', 1000);

    select count(*) into n from public.request_summary(null, null);
    if n < 1 then raise exception 'FAIL request_summary empty'; end if;
    reset role;

    -- ===== requester B
    perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.purchase_requests (id, title, description, amount) values (rb, 'B req', 'x', 50);
    select count(*) into n from public.purchase_requests where id = ra;
    if n <> 0 then raise exception 'FAIL B sees A request'; end if;
    select count(*) into n from public.audit_logs where entity_id = ra;
    if n <> 0 then raise exception 'FAIL B sees A audit rows'; end if;
    select count(*) into n from public.request_attachments where request_id = ra;
    if n <> 0 then raise exception 'FAIL B sees A attachments'; end if;
    ok := false;
    begin insert into public.request_attachments (request_id, user_id, path, filename, content_type, size_bytes)
      values (ra, ub, ub || '/' || ra || '/g.pdf', 'g.pdf', 'application/pdf', 10);
    exception when insufficient_privilege then ok := true; end;
    if not ok then raise exception 'FAIL B attached a file to A request'; end if;
    reset role;

    -- ===== approver C (default limit 10000)
    perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
    set local role authenticated;

    perform public.decide_request(ra, 'approved', null);
    select count(*) into n from public.purchase_requests where id = ra and status = 'approved';
    if n <> 1 then raise exception 'FAIL status not approved'; end if;
    select count(*) into n from public.approvals where request_id = ra and approver_name = 'Test C' and user_id = uc;
    if n <> 1 then raise exception 'FAIL approval row missing or wrong'; end if;
    select count(*) into n from public.audit_logs where entity_id = ra and action = 'approve'
      and details ->> 'approver' = 'Test C';
    if n <> 1 then raise exception 'FAIL approve audit row missing'; end if;

    ok := false;
    begin perform public.decide_request(ra, 'rejected', 'again');
    exception when others then ok := sqlerrm like '%already_decided%'; end;
    if not ok then raise exception 'FAIL decided twice'; end if;

    insert into public.purchase_requests (id, title, description, amount) values (rc, 'C own', 'x', 50);
    ok := false;
    begin perform public.decide_request(rc, 'approved', 'mine');
    exception when others then ok := sqlerrm like '%self_approval%'; end;
    if not ok then raise exception 'FAIL self approval allowed'; end if;

    ok := false;
    begin perform public.decide_request(rbig, 'approved', 'big');
    exception when others then ok := sqlerrm like '%over_limit%'; end;
    if not ok then raise exception 'FAIL over-limit approval allowed'; end if;

    ok := false;
    begin perform public.decide_request(rbig, 'rejected', '');
    exception when others then ok := sqlerrm like '%comment_required%'; end;
    if not ok then raise exception 'FAIL reject without reason allowed'; end if;
    perform public.decide_request(rbig, 'rejected', 'too big for me');
    select count(*) into n from public.purchase_requests where id = rbig and status = 'rejected';
    if n <> 1 then raise exception 'FAIL reject did not stick'; end if;

    ok := false;
    begin update public.purchase_requests set amount = 1 where id = rb;
    exception when insufficient_privilege then ok := true; end;
    if not ok then raise exception 'FAIL approver edited a request'; end if;

    select count(*) into n from public.audit_logs where entity_id in (ra, rb);
    if n < 3 then raise exception 'FAIL approver cannot see audit rows, saw %', n; end if;
    ok := false;
    begin perform * from public.list_users();
    exception when others then ok := sqlerrm like '%forbidden%'; end;
    if not ok then raise exception 'FAIL approver could list users'; end if;
    perform public.log_export('audit', 2, 'All time', null, null);
    select public.approval_limit_myr() into lim;
    if lim is distinct from 10000 then raise exception 'FAIL approver default limit is %', lim; end if;
    reset role;

    -- ===== solo-test switch: self approval only when explicitly enabled
    update public.app_settings set value = 'true' where key = 'allow_self_approval';
    perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decide_request(rc, 'approved', 'testing');
    reset role;
    update public.app_settings set value = 'false' where key = 'allow_self_approval';

    -- ===== approver E (limit 500)
    perform set_config('request.jwt.claims', json_build_object('sub', ue, 'role', 'authenticated')::text, true);
    set local role authenticated;
    ok := false;
    begin perform public.decide_request(rmid, 'approved', 'ok');
    exception when others then ok := sqlerrm like '%over_limit%'; end;
    if not ok then raise exception 'FAIL per-person limit ignored'; end if;
    reset role;

    -- ===== admin D
    perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
    set local role authenticated;
    ok := false;
    begin perform public.decide_request(rbig2, 'approved', '');
    exception when others then ok := sqlerrm like '%comment_required%'; end;
    if not ok then raise exception 'FAIL large approval without comment allowed'; end if;
    perform public.decide_request(rbig2, 'approved', 'within budget');
    select count(*) into n from public.purchase_requests where id = rbig2 and status = 'approved';
    if n <> 1 then raise exception 'FAIL admin approval did not stick'; end if;

    select count(*) into n from public.list_users();
    if n < 5 then raise exception 'FAIL admin list_users returned % rows', n; end if;

    perform public.set_user_role(uc, 'approver', 2000);
    perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role', 'authenticated')::text, true);
    select public.approval_limit_myr() into lim;
    if lim is distinct from 2000 then raise exception 'FAIL new limit not applied, saw %', lim; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);

    ok := false;
    begin perform public.set_user_role(ua, 'approver', -5);
    exception when others then ok := sqlerrm like '%invalid_limit%'; end;
    if not ok then raise exception 'FAIL negative limit accepted'; end if;

    -- ud is the only admin among the fixtures, but real admins may exist too: test last-admin on a
    -- clean slate by demoting every other admin first (rolled back with the fixtures).
    ok := false;
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
      reset role;
      update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id <> ud and raw_app_meta_data ->> 'role' = 'admin';
      set local role authenticated;
      perform public.set_user_role(ud, 'requester');
    exception when others then ok := sqlerrm like '%last_admin%'; end;
    if not ok then raise exception 'FAIL last admin could be demoted'; end if;
    reset role;
    update auth.users set raw_app_meta_data = '{"role":"admin"}' where id = ud;
    perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select count(*) into n from public.audit_logs where action = 'update' and entity_type = 'user' and entity_id = uc;
    if n <> 1 then raise exception 'FAIL role change not audited'; end if;

    perform public.rename_category(cat, 'Selftest renamed');
    select category into c from public.purchase_requests where id = rmid;
    if c is distinct from 'Selftest renamed' then raise exception 'FAIL rename did not update requests, saw %', c; end if;
    select count(*) into n from public.audit_logs where entity_type = 'category' and entity_id = cat and action = 'update';
    if n <> 1 then raise exception 'FAIL category rename not audited'; end if;
    reset role;

    -- ===== database-level guards (even for the table owner)
    ok := false;
    begin update public.purchase_requests set amount = 1 where id = rb;
    exception when others then ok := sqlerrm like '%request_immutable%'; end;
    if not ok then raise exception 'FAIL amount could be edited'; end if;
    ok := false;
    begin update public.purchase_requests set status = 'approved' where id = rb;
    exception when others then ok := sqlerrm like '%status_change_not_allowed%'; end;
    if not ok then raise exception 'FAIL status changed outside decide_request'; end if;
    ok := false;
    begin update public.purchase_requests set status = 'pending' where id = ra;
    exception when others then ok := sqlerrm like '%status_change_not_allowed%'; end;
    if not ok then raise exception 'FAIL decided request reopened'; end if;
    ok := false;
    begin update public.purchase_requests set category = 'zzz' where id = rb;
    exception when others then ok := sqlerrm like '%category_change_not_allowed%'; end;
    if not ok then raise exception 'FAIL category changed outside rename_category'; end if;
    ok := false;
    begin update public.audit_logs set action = 'tamper' where entity_id = ra;
    exception when others then ok := sqlerrm like '%append_only%'; end;
    if not ok then raise exception 'FAIL audit row updatable'; end if;
    ok := false;
    begin delete from public.approvals where request_id = ra;
    exception when others then ok := sqlerrm like '%append_only%'; end;
    if not ok then raise exception 'FAIL approval deletable'; end if;

    raise exception 'TESTS_OK';
  exception when others then
    if sqlerrm <> 'TESTS_OK' then raise; end if;
  end;
end $selftest$;

commit;

-- Confirmation (expect: settings 4, functions 9, bucket 1).
select 'settings' as what, count(*)::text as n from public.app_settings
union all select 'functions', count(*)::text from pg_proc
  where proname in ('decide_request', 'rename_category', 'log_export', 'request_summary', 'list_users',
                    'set_user_role', 'approval_limit_myr', 'setting_text', 'setting_numeric')
union all select 'bucket', count(*)::text from storage.buckets where id = 'attachments';
