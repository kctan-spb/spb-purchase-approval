-- 0005: let admins see all users and assign roles from the app (no SQL needed after the first admin).
-- Both functions are SECURITY DEFINER (they read/write auth.users) and refuse non-admins.
-- Roles live in auth.users.raw_app_meta_data.role; the JWT carries it, so a changed role reaches
-- the person's database permissions after they sign out and back in.

begin;

create or replace function public.list_users()
returns table (id uuid, email text, full_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_user_meta_data ->> 'full_name', '')::text,
           coalesce(u.raw_app_meta_data ->> 'role', 'requester')::text,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    order by u.created_at;
end $$;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_role not in ('requester', 'approver', 'admin') then
    raise exception 'invalid_role';
  end if;

  select coalesce(raw_app_meta_data ->> 'role', 'requester') into v_old from auth.users where id = p_user;
  if not found then
    raise exception 'user_not_found';
  end if;

  -- Never leave the app without an admin.
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from auth.users where raw_app_meta_data ->> 'role' = 'admin') <= 1 then
    raise exception 'last_admin';
  end if;

  if p_role = 'requester' then
    update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' where id = p_user;
  else
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
    where id = p_user;
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'update', 'user', p_user, jsonb_build_object('role_from', v_old, 'role_to', p_role));
end $$;

revoke all on function public.list_users(), public.set_user_role(uuid, text) from public, anon;
grant execute on function public.list_users(), public.set_user_role(uuid, text) to authenticated;

commit;
