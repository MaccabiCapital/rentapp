-- ============================================================
-- rent_schedules — expected rent lines per lease per period
-- ============================================================
--
-- Part B of Sprint 12 (rent simulation). We can't ship Stripe
-- collection until the LLC is in place, but we CAN model the full
-- flow with scheduled rows + manual payments + a simulation
-- action that advances a demo cycle. This table is the "what
-- should arrive" side; payments is the "what did arrive" side.
--
-- Generation strategy: on-demand. When the /dashboard/rent page
-- loads we ensure there's a schedule row for every active lease
-- for each month in the window [-1 month, now + 3 weeks]. If a
-- user wants to extend further they can simulate ahead.

create type rent_schedule_status as enum (
  'upcoming',
  'due',
  'paid',
  'partial',
  'overdue',
  'skipped'
);

create table public.rent_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  due_date date not null,
  amount numeric(10,2) not null,
  paid_amount numeric(10,2) not null default 0,
  status rent_schedule_status not null default 'upcoming',
  method text, -- free text for now (cash, zelle, check, etc.)
  payment_id uuid references public.payments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (lease_id, due_date)
);

create index rent_schedules_owner_idx
  on public.rent_schedules (owner_id) where deleted_at is null;
create index rent_schedules_lease_idx
  on public.rent_schedules (lease_id, due_date) where deleted_at is null;
create index rent_schedules_due_idx
  on public.rent_schedules (due_date) where deleted_at is null;
create index rent_schedules_status_idx
  on public.rent_schedules (status) where deleted_at is null;

alter table public.rent_schedules enable row level security;

create policy "owner can select own rent_schedules"
  on public.rent_schedules for select to authenticated using (owner_id = auth.uid());
create policy "owner can insert own rent_schedules"
  on public.rent_schedules for insert to authenticated with check (owner_id = auth.uid());
create policy "owner can update own rent_schedules"
  on public.rent_schedules for update to authenticated using (owner_id = auth.uid());
create policy "owner can delete own rent_schedules"
  on public.rent_schedules for delete to authenticated using (owner_id = auth.uid());

create trigger set_updated_at before update on public.rent_schedules
  for each row execute procedure public.set_updated_at();
