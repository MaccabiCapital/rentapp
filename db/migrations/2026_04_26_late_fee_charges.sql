-- ============================================================
-- Late fee auto-application — Sprint 14+
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Track each late fee charge as its own row so we can audit when
-- fees were applied, by which mechanism (auto vs manual), and
-- whether they were paid or waived.
--
-- A rent_schedule can in theory accrue multiple late fees over
-- time (some leases compound monthly), so this is one-to-many.
--
-- Settings live on the lease already:
--   leases.late_fee_amount      — flat dollar amount
--   leases.late_fee_grace_days  — days past due before fee triggers
--
-- State caps live on state_rent_rules (late_fee_max_percent /
-- late_fee_grace_days_min). The auto-scan respects them at
-- charge-creation time and refuses to apply over the cap.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type late_fee_status as enum (
  'pending',   -- charge applied but tenant hasn't paid yet
  'paid',      -- tenant paid the fee
  'waived'     -- landlord waived (no charge collected)
);

create type late_fee_source as enum (
  'auto_scan',   -- daily cron applied this fee
  'manual'       -- landlord clicked "apply late fee" button
);

-- ------------------------------------------------------------
-- late_fee_charges
-- ------------------------------------------------------------

create table public.late_fee_charges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  rent_schedule_id uuid not null references public.rent_schedules(id) on delete cascade,

  amount numeric(10, 2) not null check (amount >= 0),
  status late_fee_status not null default 'pending',
  source late_fee_source not null,

  -- Snapshot of state cap at apply time, for legal record
  state_max_percent numeric(5, 2),

  -- Lifecycle timestamps
  applied_on date not null default current_date,
  paid_at timestamptz,
  waived_at timestamptz,
  waived_reason text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Idempotency: one auto-scan fee per (rent_schedule, applied_on).
-- The unique partial index lets us re-run the scan safely without
-- duplicating fees, but still allows manual + auto on the same
-- day (manual entries don't conflict).
create unique index late_fee_charges_auto_unique_idx
  on public.late_fee_charges (rent_schedule_id, applied_on)
  where source = 'auto_scan' and deleted_at is null;

create index late_fee_charges_owner_idx
  on public.late_fee_charges (owner_id) where deleted_at is null;
create index late_fee_charges_lease_idx
  on public.late_fee_charges (lease_id) where deleted_at is null;
create index late_fee_charges_rent_schedule_idx
  on public.late_fee_charges (rent_schedule_id) where deleted_at is null;
create index late_fee_charges_status_idx
  on public.late_fee_charges (status) where deleted_at is null;

alter table public.late_fee_charges enable row level security;

create policy "owner can select own late fee charges"
  on public.late_fee_charges for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own late fee charges"
  on public.late_fee_charges for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own late fee charges"
  on public.late_fee_charges for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own late fee charges"
  on public.late_fee_charges for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.late_fee_charges
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Telemetry on landlord_settings — when did the auto-scan last run?
-- ------------------------------------------------------------

alter table public.landlord_settings
  add column if not exists last_late_fee_scan_at timestamptz,
  add column if not exists last_late_fee_scan_summary jsonb;
