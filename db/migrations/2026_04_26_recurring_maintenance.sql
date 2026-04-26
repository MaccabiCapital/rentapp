-- ============================================================
-- Recurring maintenance schedules
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Things landlords should do every X months/years but always
-- forget: HVAC service, smoke detector battery, gutter cleaning,
-- pest control, smoke alarm test, water heater flush, etc.
--
-- One row per recurring task. The task is associated with a
-- property (most common) or a unit (when it's unit-specific
-- like in-unit fire extinguisher inspection).
--
-- next_due_date is the planning anchor. Each time the landlord
-- marks it complete, we advance next_due_date by frequency_value
-- frequency_unit and append to a completion log (separate table
-- for clean audit).

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type recurring_maintenance_frequency_unit as enum (
  'days',
  'weeks',
  'months',
  'years'
);

create type recurring_maintenance_status as enum (
  'active',         -- on schedule
  'paused',         -- manually paused (snowbird landlord, etc.)
  'archived'        -- no longer relevant; kept for history
);

-- ------------------------------------------------------------
-- recurring_maintenance_tasks
-- ------------------------------------------------------------

create table public.recurring_maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- Scope: property-level OR unit-level. Exactly one is set.
  property_id uuid references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,

  title text not null,
  description text,
  category text,                                  -- 'hvac', 'pest', 'smoke_detector', 'plumbing', 'exterior', 'safety', 'other'

  frequency_value int not null check (frequency_value > 0),
  frequency_unit recurring_maintenance_frequency_unit not null,

  -- The countdown
  next_due_date date not null,
  lead_time_days int not null default 14,         -- alert N days before due

  -- Last completion (denormalized for quick lookup; full history
  -- in recurring_maintenance_completions)
  last_completed_at timestamptz,
  last_completed_notes text,

  -- Vendor / contractor
  vendor_name text,
  vendor_phone text,
  vendor_email text,

  status recurring_maintenance_status not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Exactly one of property_id or unit_id must be set.
  constraint recurring_maintenance_scope_check check (
    (property_id is not null and unit_id is null)
    or (property_id is null and unit_id is not null)
  )
);

create index recurring_maintenance_tasks_owner_idx
  on public.recurring_maintenance_tasks (owner_id) where deleted_at is null;
create index recurring_maintenance_tasks_property_idx
  on public.recurring_maintenance_tasks (property_id) where deleted_at is null;
create index recurring_maintenance_tasks_unit_idx
  on public.recurring_maintenance_tasks (unit_id) where deleted_at is null;
create index recurring_maintenance_tasks_due_idx
  on public.recurring_maintenance_tasks (next_due_date) where deleted_at is null;
create index recurring_maintenance_tasks_status_idx
  on public.recurring_maintenance_tasks (status) where deleted_at is null;

alter table public.recurring_maintenance_tasks enable row level security;
create policy "owners select on rmt" on public.recurring_maintenance_tasks
  for select using (owner_id = auth.uid());
create policy "owners insert on rmt" on public.recurring_maintenance_tasks
  for insert with check (owner_id = auth.uid());
create policy "owners update on rmt" on public.recurring_maintenance_tasks
  for update using (owner_id = auth.uid());
create policy "owners delete on rmt" on public.recurring_maintenance_tasks
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_recurring_maintenance_tasks
  before update on public.recurring_maintenance_tasks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- recurring_maintenance_completions — full audit trail
-- ------------------------------------------------------------

create table public.recurring_maintenance_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.recurring_maintenance_tasks(id) on delete cascade,

  completed_on date not null,
  notes text,
  cost_cents int,                              -- optional cost tracking
  vendor_used text,                            -- what they actually used (vs. saved vendor)

  created_at timestamptz not null default now()
);

create index recurring_maintenance_completions_owner_idx
  on public.recurring_maintenance_completions (owner_id);
create index recurring_maintenance_completions_task_idx
  on public.recurring_maintenance_completions (task_id);

alter table public.recurring_maintenance_completions enable row level security;
create policy "owners select on rmc" on public.recurring_maintenance_completions
  for select using (owner_id = auth.uid());
create policy "owners insert on rmc" on public.recurring_maintenance_completions
  for insert with check (owner_id = auth.uid());
-- No update/delete: completions are an immutable audit log.
