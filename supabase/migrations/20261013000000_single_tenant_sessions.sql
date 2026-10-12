-- ============================================================
-- SINGLE-TENANT SESSIONS + DEVICE FINGERPRINTING
-- ============================================================
-- Removes user_id from all application tables.
-- Introduces sessions + devices tables for active session
-- management and device fingerprinting.
-- ============================================================

-- ------------------------------------------------------------
-- 1. DROP the old RLS helpers that depend on user_id
-- ------------------------------------------------------------
drop function if exists public.has_role(_user_id uuid, _role public.app_role) cascade;
drop function if exists public.seed_workspace(_uid uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop trigger if exists on_auth_user_created on auth.users;

-- ------------------------------------------------------------
-- 2. Drop user_id from every application table
-- ------------------------------------------------------------
alter table public.profiles drop column if exists id;
alter table public.profiles add column id uuid primary key default gen_random_uuid();

alter table public.user_roles drop column if exists user_id;
-- user_roles no longer needed for single tenant; drop the table
drop table if exists public.user_roles cascade;

-- Every data table: drop user_id column + its FK + its index
do $$
declare
  t text;
begin
  foreach t in array array[
    'financial_accounts','categories','payment_methods','events','transactions',
    'recurring_transactions','budgets','event_budget_items','event_guests','event_vendors',
    'event_payments','tasks','calendar_items','meetings'
  ] loop
    -- drop FK first (names like <table>_user_id_fkey)
    execute format('alter table public.%I drop constraint if exists %I;', t, t || '_user_id_fkey');
    -- drop column
    execute format('alter table public.%I drop column if exists user_id;', t);
    -- drop RLS policies that reference user_id
    execute format('drop policy if exists %I_own on public.%I;', t, t);
    execute format('drop policy if exists %I_admin_read on public.%I;', t, t);
    -- drop indexes that were on (user_id, ...)
    execute format('drop index if exists public.%I;', t);
    -- drop updated_at trigger (will re-add below)
    execute format('drop trigger if exists trg_%I_updated on public.%I;', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. Re-create RLS policies for single-tenant access
--    Any authenticated user can read/write all rows.
--    The tenant is implicit: there is only one tenant.
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'financial_accounts','categories','payment_methods','events','transactions',
    'recurring_transactions','budgets','event_budget_items','event_guests','event_vendors',
    'event_payments','tasks','calendar_items','meetings'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    -- single policy: any authenticated user
    execute format(
      'create policy "%1$s_any_authenticated" on public.%1$I for all to authenticated using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
    -- re-add updated_at trigger
    if t <> 'payment_methods' then
      execute format('create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();', t);
    end if;
  end loop;
end $$;

-- profiles: simple policy, no user_id linkage
create policy "profiles_any_authenticated" on public.profiles for all to authenticated
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4. sessions table — active login sessions
-- ------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  -- the Supabase auth user id that owns this session
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  -- human-readable label given by the frontend (e.g. "MacBook Pro · Chrome")
  device_label text not null default '',
  -- fingerprint captured at login time (see client-side fingerprinting)
  fingerprint_hash text not null default '',
  -- which IP was used at login
  ip_address inet,
  -- browser user-agent at login
  user_agent text,
  -- when the session was created
  created_at timestamptz not null default now(),
  -- last time this session was seen making a request
  last_active_at timestamptz not null default now(),
  -- whether this session is currently valid
  revoked boolean not null default false
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;

-- A user can see their own sessions
create policy "sessions_select_own" on public.sessions for select to authenticated
  using (auth_user_id = auth.uid());
create policy "sessions_insert_own" on public.sessions for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy "sessions_update_own" on public.sessions for update to authenticated
  using (auth_user_id = auth.uid());
create policy "sessions_delete_own" on public.sessions for delete to authenticated
  using (auth_user_id = auth.uid());

create index on public.sessions (auth_user_id, created_at desc);

-- ------------------------------------------------------------
-- 5. sessions_activity — append-only audit of session events
--    (login, logout, revoke, device change, etc.)
-- ------------------------------------------------------------
create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_type text not null default 'login', -- login | logout | revoke | fingerprint_mismatch | reauth
  note text,
  created_at timestamptz not null default now()
);
grant select on public.session_events to authenticated;
grant all on public.session_events to service_role;
alter table public.session_events enable row level security;

create policy "session_events_select_own" on public.session_events for select to authenticated
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_events.session_id
        and sessions.auth_user_id = auth.uid()
    )
  );

create index on public.session_events (session_id, created_at desc);

-- ------------------------------------------------------------
-- 6. Helper: record a session event
-- ------------------------------------------------------------
create or replace function public.log_session_event(
  _session_id uuid,
  _event_type text,
  _note text default null
) returns void language sql security definer set search_path = public as $$
  insert into public.session_events (session_id, event_type, note)
  values (_session_id, _event_type, _note);
$$;

-- ------------------------------------------------------------
-- 7. Helper: get current session context for the caller
--    Returns the active session row for the current auth user,
--    matching the supplied fingerprint. Returns null if the
--    session is revoked or fingerprint doesn't match.
-- ------------------------------------------------------------
create or replace function public.current_session(
  _fingerprint_hash text default null
) returns public.sessions language sql stable security definer set search_path = public as $$
  select s.* from public.sessions s
  where s.auth_user_id = auth.uid()
    and s.revoked = false
    and (
      -- if no fingerprint supplied, just return any active session
      _fingerprint_hash is null
      -- otherwise require fingerprint match
      or s.fingerprint_hash = _fingerprint_hash
    )
  order by s.last_active_at desc
  limit 1;
$$;

-- ------------------------------------------------------------
-- 8. Helper: revoke all other sessions for the current user
--    (used by "Log out everywhere except this device")
-- ------------------------------------------------------------
create or replace function public.revoke_other_sessions(
  _keep_session_id uuid
) returns void language sql security definer set search_path = public as $$
  update public.sessions
  set revoked = true
  where auth_user_id = auth.uid()
    and id <> _keep_session_id;
$$;

-- ------------------------------------------------------------
-- 9. Trigger: update last_active_at on session activity
-- ------------------------------------------------------------
create or replace function public.touch_session() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.sessions set last_active_at = now()
  where id = new.session_id;
  return new;
end $$;

create trigger trg_session_events_touch
  after insert on public.session_events
  for each row
  execute function public.touch_session();

-- ------------------------------------------------------------
-- 10. Cleanup trigger on auth.users delete
--     (keeps sessions in sync if a user is deleted via dashboard)
-- ------------------------------------------------------------
create or replace function public.delete_user_sessions() returns trigger
language plpgsql set search_path = public as $$
begin
  delete from public.sessions where auth_user_id = old.id;
  return old;
end $$;

create trigger trg_cleanup_user_sessions
  after delete on auth.users
  for each row
  execute function public.delete_user_sessions();

-- ------------------------------------------------------------
-- 11. Set a stable tenant identifier in the DB for this project.
--     Single tenant = the one auth user that exists.
--     We store the tenant "id" as a conveninent reference but
--     every policy above already gates on auth.role() = 'authenticated'.
-- ------------------------------------------------------------
-- (No per-row tenant column needed. All rows belong to the single tenant.)
