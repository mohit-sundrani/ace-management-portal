-- MEETING MODE
create type public.meeting_mode as enum ('online','offline');

-- MEETINGS
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  mode public.meeting_mode not null default 'online',
  points jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.meetings (user_id, date);

grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;
alter table public.meetings enable row level security;
create policy "meetings_own" on public.meetings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meetings_admin_read" on public.meetings for select to authenticated
  using (public.has_role(auth.uid(),'administrator'));
create trigger trg_meetings_updated before update on public.meetings
  for each row execute function public.set_updated_at();
