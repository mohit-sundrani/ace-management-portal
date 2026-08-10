-- ENUMS
create type public.app_role as enum ('administrator','user');
create type public.account_type as enum ('cash','bank','savings','wallet','credit_card','other');
create type public.txn_type as enum ('income','expense');
create type public.task_status as enum ('todo','ongoing','complete');
create type public.task_priority as enum ('low','medium','high');
create type public.event_status as enum ('planning','active','completed','cancelled');
create type public.rsvp_status as enum ('invited','confirmed','declined','tentative','attended');
create type public.payment_status as enum ('unpaid','partial','paid');
create type public.recurrence as enum ('daily','weekly','monthly','yearly');
create type public.budget_period as enum ('monthly','yearly','custom');

-- UTIL
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'administrator'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'administrator'));

-- ACCOUNTS
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'bank',
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'INR',
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind public.txn_type not null,
  color text not null default '#867E8E',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

-- PAYMENT METHODS
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- EVENTS
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  end_date date,
  location text,
  status public.event_status not null default 'planning',
  planned_budget numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.txn_type not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  occurred_at time,
  description text not null default '',
  reference text,
  notes text,
  account_id uuid references public.financial_accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.transactions (user_id, occurred_on desc);
create index on public.transactions (event_id);

-- RECURRING
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.txn_type not null,
  amount numeric(14,2) not null check (amount > 0),
  frequency public.recurrence not null default 'monthly',
  interval_count int not null default 1,
  next_run_on date not null,
  end_on date,
  is_active boolean not null default true,
  account_id uuid references public.financial_accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BUDGETS
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  period public.budget_period not null default 'monthly',
  start_date date not null,
  end_date date not null,
  planned_amount numeric(14,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- EVENT BUDGET ITEMS
create table public.event_budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  kind public.txn_type not null,
  label text not null,
  planned_amount numeric(14,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GUESTS
create table public.event_guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  contact text,
  rsvp public.rsvp_status not null default 'invited',
  party_size int not null default 1 check (party_size > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VENDORS
create table public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  service text,
  contact text,
  agreed_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) not null default 0,
  status public.payment_status not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_vendor_totals() returns trigger
language plpgsql set search_path = public as $$
begin
  new.remaining_amount := greatest(new.agreed_amount - new.paid_amount, 0);
  new.status := case
    when new.paid_amount <= 0 then 'unpaid'::public.payment_status
    when new.paid_amount >= new.agreed_amount then 'paid'::public.payment_status
    else 'partial'::public.payment_status end;
  return new;
end $$;
create trigger trg_vendor_totals before insert or update on public.event_vendors
for each row execute function public.sync_vendor_totals();

-- EVENT PAYMENTS
create table public.event_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid references public.event_vendors(id) on delete set null,
  label text not null,
  direction public.txn_type not null default 'expense',
  planned_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  due_date date,
  paid_on date,
  status public.payment_status not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  scheduled_date date,
  start_time time,
  end_time time,
  reminder_at timestamptz,
  category text,
  notes text,
  event_id uuid references public.events(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (user_id, status);

-- CALENDAR
create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  start_time time,
  end_date date,
  end_time time,
  all_day boolean not null default false,
  location text,
  notes text,
  reminder_at timestamptz,
  event_id uuid references public.events(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.calendar_items (user_id, start_date);

-- GRANTS + RLS + POLICIES + updated_at triggers for all owned tables
do $$
declare t text;
begin
  foreach t in array array['financial_accounts','categories','payment_methods','events','transactions',
    'recurring_transactions','budgets','event_budget_items','event_guests','event_vendors',
    'event_payments','tasks','calendar_items']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "%1$s_own" on public.%1$I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    execute format('create policy "%1$s_admin_read" on public.%1$I for select to authenticated using (public.has_role(auth.uid(),''administrator''));', t);
    if t <> 'payment_methods' then
      execute format('create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();', t);
    end if;
  end loop;
end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- SEED + NEW USER BOOTSTRAP
-- create or replace function public.seed_workspace(_uid uuid)
-- returns void language plpgsql security definer set search_path = public as $$
-- declare
--   acc_bank uuid; acc_cash uuid; acc_sav uuid;
--   cat_salary uuid; cat_free uuid; cat_evinc uuid; cat_spon uuid;
--   cat_food uuid; cat_transport uuid; cat_util uuid; cat_venue uuid; cat_mkt uuid; cat_equip uuid;
--   pm_upi uuid; pm_bank uuid; pm_cash uuid; pm_card uuid;
--   ev_fest uuid; ev_trip uuid; ev_work uuid;
--   ven_sound uuid; ven_cater uuid;
--   today date := current_date;
-- begin
--   insert into public.financial_accounts (user_id,name,type,opening_balance,description)
--   values (_uid,'HDFC Current','bank',185000,'Primary operating account') returning id into acc_bank;
--   insert into public.financial_accounts (user_id,name,type,opening_balance,description)
--   values (_uid,'Cash Wallet','cash',12000,'Petty cash for on-ground spending') returning id into acc_cash;
--   insert into public.financial_accounts (user_id,name,type,opening_balance,description)
--   values (_uid,'Emergency Savings','savings',240000,'Six-month runway, untouched') returning id into acc_sav;

--   insert into public.categories (user_id,name,kind,color) values
--     (_uid,'Salary','income','#00B442') returning id into cat_salary;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Freelance','income','#32F3E9') returning id into cat_free;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Event Income','income','#22FF73') returning id into cat_evinc;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Sponsorship','income','#6C3BFF') returning id into cat_spon;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Food','expense','#F5A623') returning id into cat_food;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Transport','expense','#863BFF') returning id into cat_transport;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Utilities','expense','#867E8E') returning id into cat_util;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Venue','expense','#E5484D') returning id into cat_venue;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Marketing','expense','#B39AFF') returning id into cat_mkt;
--   insert into public.categories (user_id,name,kind,color) values (_uid,'Equipment','expense','#3B3440') returning id into cat_equip;

--   insert into public.payment_methods (user_id,name) values (_uid,'UPI') returning id into pm_upi;
--   insert into public.payment_methods (user_id,name) values (_uid,'Bank Transfer') returning id into pm_bank;
--   insert into public.payment_methods (user_id,name) values (_uid,'Cash') returning id into pm_cash;
--   insert into public.payment_methods (user_id,name) values (_uid,'Credit Card') returning id into pm_card;

--   insert into public.events (user_id,name,description,start_date,end_date,location,status,planned_budget,notes)
--   values (_uid,'Annual College Fest','Three-day inter-college cultural and tech festival.',today + 24, today + 26,'Main Campus Grounds','active',750000,'Sponsor deck locked. Stage layout pending approval.')
--   returning id into ev_fest;
--   insert into public.events (user_id,name,description,start_date,end_date,location,status,planned_budget,notes)
--   values (_uid,'Kerala Backwaters Trip','Seven-day travel plan with four people.',today + 68, today + 75,'Alleppey, Kerala','planning',96000,'Houseboat booking window opens next month.')
--   returning id into ev_trip;
--   insert into public.events (user_id,name,description,start_date,end_date,location,status,planned_budget,notes)
--   values (_uid,'Rust Tooling Workshop','One-day paid workshop for 40 engineers.',today - 21, today - 21,'WeWork Koramangala','completed',120000,'Sold out. Feedback average 4.6/5.')
--   returning id into ev_work;

--   insert into public.event_budget_items (user_id,event_id,kind,label,planned_amount,category_id) values
--     (_uid,ev_fest,'income','Ticket sales',320000,cat_evinc),
--     (_uid,ev_fest,'income','Title sponsor',250000,cat_spon),
--     (_uid,ev_fest,'income','Stall registrations',90000,cat_evinc),
--     (_uid,ev_fest,'expense','Venue and stage',280000,cat_venue),
--     (_uid,ev_fest,'expense','Sound and lighting',150000,cat_equip),
--     (_uid,ev_fest,'expense','Catering',120000,cat_food),
--     (_uid,ev_fest,'expense','Marketing and print',70000,cat_mkt),
--     (_uid,ev_trip,'expense','Houseboat',48000,cat_venue),
--     (_uid,ev_trip,'expense','Travel',28000,cat_transport),
--     (_uid,ev_work,'income','Seat sales',160000,cat_evinc),
--     (_uid,ev_work,'expense','Venue hire',35000,cat_venue),
--     (_uid,ev_work,'expense','Lunch and coffee',24000,cat_food);

--   insert into public.event_guests (user_id,event_id,name,contact,rsvp,party_size,notes) values
--     (_uid,ev_fest,'Dr. Anitha Raghavan','anitha.r@campus.edu','confirmed',2,'Chief guest, needs reserved parking'),
--     (_uid,ev_fest,'Karthik Menon','karthik@northbridge.io','confirmed',1,'Title sponsor representative'),
--     (_uid,ev_fest,'Sneha Iyer','sneha.iyer@gmail.com','tentative',3,'Alumni panel'),
--     (_uid,ev_fest,'Rahul Deshpande','rahul.d@techpress.in','invited',1,'Press coverage'),
--     (_uid,ev_work,'Priya Nair','priya@rustlabs.dev','attended',1,'Guest instructor');

--   insert into public.event_vendors (user_id,event_id,name,service,contact,agreed_amount,paid_amount,notes)
--   values (_uid,ev_fest,'Nova Sound Systems','Sound and lighting','+91 98450 11223',150000,60000,'40% advance paid')
--   returning id into ven_sound;
--   insert into public.event_vendors (user_id,event_id,name,service,contact,agreed_amount,paid_amount,notes)
--   values (_uid,ev_fest,'Green Leaf Catering','Catering for 900 pax','+91 99010 44521',120000,0,'Menu tasting scheduled')
--   returning id into ven_cater;
--   insert into public.event_vendors (user_id,event_id,name,service,contact,agreed_amount,paid_amount,notes) values
--     (_uid,ev_fest,'PrintWorks','Banners and passes','+91 97400 88110',48000,48000,'Delivered'),
--     (_uid,ev_trip,'Alleppey Houseboats','Two-night houseboat','+91 94470 33221',48000,10000,'Advance blocked');

--   insert into public.event_payments (user_id,event_id,vendor_id,label,direction,planned_amount,paid_amount,due_date,paid_on,status) values
--     (_uid,ev_fest,ven_sound,'Sound advance','expense',60000,60000,today - 6,today - 6,'paid'),
--     (_uid,ev_fest,ven_sound,'Sound balance','expense',90000,0,today + 20,null,'unpaid'),
--     (_uid,ev_fest,ven_cater,'Catering advance','expense',48000,0,today + 3,null,'unpaid'),
--     (_uid,ev_fest,null,'Title sponsor tranche 1','income',150000,150000,today - 12,today - 12,'paid'),
--     (_uid,ev_fest,null,'Venue final settlement','expense',180000,0,today + 18,null,'unpaid');

--   insert into public.tasks (user_id,title,description,status,priority,due_date,scheduled_date,start_time,end_time,category,event_id) values
--     (_uid,'Finalise venue booking','Confirm the ground permit and stage footprint with the estate office.','ongoing','high',today + 4,today + 1,'10:00','11:00','Logistics',ev_fest),
--     (_uid,'Contact remaining sponsors','Follow up with three warm leads from last year.','ongoing','high',today + 6,today + 2,'15:00','16:30','Sponsorship',ev_fest),
--     (_uid,'Approve poster artwork','Second revision from the design team.','todo','medium',today + 8,today + 3,'12:00','12:30','Marketing',ev_fest),
--     (_uid,'Pay catering advance','Release 40% to Green Leaf before menu lock.','todo','high',today + 3,today,'14:00','14:30','Finance',ev_fest),
--     (_uid,'Book houseboat','Compare three operators before paying advance.','todo','medium',today + 30,today + 12,null,null,'Travel',ev_trip),
--     (_uid,'Reconcile August statement','Match bank entries against recorded transactions.','todo','medium',today - 2,today,'17:00','18:00','Finance',null),
--     (_uid,'Workshop feedback summary','Compile responses and publish internally.','complete','low',today - 18,today - 18,null,null,'Reporting',ev_work),
--     (_uid,'Renew domain and hosting','Annual renewal for the personal site.','todo','low',today + 14,null,null,null,'Admin',null);

--   update public.tasks set completed_at = now() - interval '18 days' where user_id = _uid and status = 'complete';

--   insert into public.calendar_items (user_id,title,description,start_date,start_time,end_date,end_time,all_day,location,event_id) values
--     (_uid,'Review event budget','Walk through planned vs actual with the finance lead.',today,'09:00',today,'10:00',false,'Finance room',ev_fest),
--     (_uid,'Vendor meeting - Nova Sound','Stage plot and power requirements.',today,'11:00',today,'12:00',false,'Campus AV room',ev_fest),
--     (_uid,'Pay venue instalment','Bank transfer window.',today,'14:00',today,'14:30',false,null,ev_fest),
--     (_uid,'Sponsor call - Northbridge','Tranche 2 timing.',today + 2,'16:00',today + 2,'16:45',false,'Google Meet',ev_fest),
--     (_uid,'Equipment pickup',null,today + 5,null,today + 5,null,true,'Nova warehouse',ev_fest),
--     (_uid,'Monthly finance review','Close the books for the month.',today + 9,'17:00',today + 9,'18:00',false,null,null),
--     (_uid,'Annual College Fest - Day 1',null,today + 24,null,today + 24,null,true,'Main Campus Grounds',ev_fest);

--   insert into public.transactions (user_id,type,amount,occurred_on,description,account_id,category_id,payment_method_id,event_id,reference) values
--     (_uid,'income',95000,today - 32,'Monthly salary',acc_bank,cat_salary,pm_bank,null,'SAL-0824'),
--     (_uid,'income',95000,today - 2,'Monthly salary',acc_bank,cat_salary,pm_bank,null,'SAL-0924'),
--     (_uid,'income',48000,today - 15,'Frontend consulting retainer',acc_bank,cat_free,pm_bank,null,'INV-231'),
--     (_uid,'income',150000,today - 12,'Title sponsor tranche 1',acc_bank,cat_spon,pm_bank,ev_fest,'SPON-01'),
--     (_uid,'income',62000,today - 9,'Early-bird ticket sales',acc_bank,cat_evinc,pm_upi,ev_fest,'TKT-EB'),
--     (_uid,'income',160000,today - 21,'Workshop seat sales',acc_bank,cat_evinc,pm_upi,ev_work,'WS-SEATS'),
--     (_uid,'expense',60000,today - 6,'Nova Sound advance',acc_bank,cat_equip,pm_bank,ev_fest,'VEN-NS-01'),
--     (_uid,'expense',48000,today - 4,'Banners, passes and print',acc_bank,cat_mkt,pm_upi,ev_fest,'PRT-118'),
--     (_uid,'expense',100000,today - 8,'Venue booking advance',acc_bank,cat_venue,pm_bank,ev_fest,'VEN-GRD'),
--     (_uid,'expense',35000,today - 21,'Workshop venue hire',acc_bank,cat_venue,pm_bank,ev_work,'WS-VEN'),
--     (_uid,'expense',22400,today - 21,'Workshop lunch and coffee',acc_bank,cat_food,pm_card,ev_work,'WS-FNB'),
--     (_uid,'expense',7800,today - 3,'Groceries and household',acc_cash,cat_food,pm_cash,null,null),
--     (_uid,'expense',3200,today - 1,'Cab and metro',acc_cash,cat_transport,pm_upi,null,null),
--     (_uid,'expense',5400,today - 5,'Electricity and broadband',acc_bank,cat_util,pm_upi,null,'UTL-09'),
--     (_uid,'expense',10000,today - 7,'Houseboat advance',acc_bank,cat_venue,pm_upi,ev_trip,'HB-ADV');

--   insert into public.recurring_transactions (user_id,name,type,amount,frequency,next_run_on,account_id,category_id,notes) values
--     (_uid,'Monthly salary','income',95000,'monthly',date_trunc('month',today)::date + interval '1 month',acc_bank,cat_salary,'Credited on the 1st'),
--     (_uid,'Rent','expense',28000,'monthly',date_trunc('month',today)::date + interval '1 month',acc_bank,cat_util,'Auto-debit'),
--     (_uid,'Cloud subscriptions','expense',4200,'monthly',date_trunc('month',today)::date + interval '1 month',acc_bank,cat_util,'Hosting and storage');

--   insert into public.budgets (user_id,name,period,start_date,end_date,planned_amount,category_id) values
--     (_uid,'Monthly food','monthly',date_trunc('month',today)::date,(date_trunc('month',today) + interval '1 month - 1 day')::date,15000,cat_food),
--     (_uid,'Monthly transport','monthly',date_trunc('month',today)::date,(date_trunc('month',today) + interval '1 month - 1 day')::date,6000,cat_transport),
--     (_uid,'Monthly utilities','monthly',date_trunc('month',today)::date,(date_trunc('month',today) + interval '1 month - 1 day')::date,8000,cat_util),
--     (_uid,'Fest marketing cap','custom',today - 30,today + 30,70000,cat_mkt);
-- end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  perform public.seed_workspace(new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
