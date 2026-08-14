-- SINGLE-OWNER WORKSPACE
-- The console is a single-owner workspace. Roles are removed entirely and the
-- authenticated user is implicitly the owner. This migration drops the role
-- infrastructure (user_roles, app_role, has_role) and every policy that
-- depended on it, then simplifies the profile bootstrap accordingly.

-- 1. Drop admin read policies that referenced has_role()
do $$
declare t text;
begin
  foreach t in array array['financial_accounts','categories','payment_methods','events','transactions',
    'recurring_transactions','budgets','event_budget_items','event_guests','event_vendors',
    'event_payments','tasks','calendar_items']
  loop
    execute format('drop policy if exists "%1$s_admin_read" on public.%1$I;', t);
  end loop;
end $$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;

-- 2. Drop the old bootstrap trigger/function before removing role tables
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3. Drop role infrastructure
drop table if exists public.user_roles;
drop function if exists public.has_role(uuid, public.app_role);
drop type if exists public.app_role;

-- 4. Recreate the bootstrap without roles
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. Owner-only select policy for profiles (the only profile a user sees is their own)
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid());
