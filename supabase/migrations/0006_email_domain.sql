-- 0006: only company email addresses can create an account (or change an account's email to
-- another domain). Enforced in the database so it cannot be bypassed by calling the Supabase API
-- directly. Existing accounts are not touched. Accounts you add by hand must use this domain too.
--
-- To change the domain: edit the literal below and lib/email-domain.ts.
-- To undo:  drop trigger if exists enforce_email_domain on auth.users;

begin;

create or replace function public.enforce_email_domain() returns trigger
language plpgsql as $$
declare
  v_parts text[] := string_to_array(lower(btrim(coalesce(new.email, ''))), '@');
begin
  if array_length(v_parts, 1) is distinct from 2
     or v_parts[1] = ''
     or v_parts[2] <> 'selangorproperties.com.my' then
    raise exception 'email_domain_not_allowed';
  end if;
  return new;
end $$;

drop trigger if exists enforce_email_domain on auth.users;
create trigger enforce_email_domain
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_domain();

commit;

-- Check: should list the trigger (one row).
select tgname as email_domain_trigger from pg_trigger where tgname = 'enforce_email_domain' and not tgisinternal;
