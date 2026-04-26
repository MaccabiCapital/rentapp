-- ============================================================
-- Sprint 14+ — Security deposit settlement (move-out accounting)
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Generates the itemized deposit-accounting letter required at
-- move-out by every US state. Pre-populates damage deductions
-- from the existing move-in vs move-out inspection comparison.
--
-- Tables:
--   security_deposit_settlements       — header (one per move-out)
--   security_deposit_deduction_items   — line items (one per deduction)
--
-- Forwarding address lives in two places:
--   1. tenants.forwarding_*            — captured when notice is given;
--                                        permanent record on the tenant
--   2. settlement.forwarding_*         — snapshot at settlement time;
--                                        editable, in case it changes
--
-- Legal deadline is computed at finalize time from
-- state_rent_rules.security_deposit_return_days joined via the
-- lease's unit's property's state.

-- ------------------------------------------------------------
-- Tenant forwarding address (post-move-out mailing destination)
-- ------------------------------------------------------------

alter table public.tenants
  add column if not exists forwarding_street_address text,
  add column if not exists forwarding_unit text,
  add column if not exists forwarding_city text,
  add column if not exists forwarding_state text,
  add column if not exists forwarding_postal_code text,
  add column if not exists forwarding_captured_at timestamptz;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type security_deposit_status as enum (
  'draft',         -- being filled out, editable
  'finalized',     -- locked itemization, ready to mail
  'mailed'         -- mailed to tenant; legal clock satisfied
);

create type security_deposit_deduction_category as enum (
  'damage',           -- physical damage beyond normal wear
  'cleaning',         -- excessive cleaning required
  'unpaid_rent',      -- balance owed under the lease
  'unpaid_utilities', -- tenant-responsible utilities not paid
  'late_fees',        -- fees due under the lease that went unpaid
  'lockout_or_keys',  -- lost keys, lockouts, lock changes
  'other'             -- anything else (escape hatch)
);

create type security_deposit_mail_method as enum (
  'first_class_mail',
  'certified_mail',
  'hand_delivered',
  'electronic_with_consent'  -- some states allow this with prior written consent
);

-- ------------------------------------------------------------
-- Settlement header
-- ------------------------------------------------------------

create table public.security_deposit_settlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,

  status security_deposit_status not null default 'draft',

  -- Snapshot of the deposit at the time the settlement is generated.
  -- Doesn't follow the lease if someone later changes the lease record.
  original_deposit numeric(12, 2) not null,

  -- Forwarding address snapshot. Editable per settlement so a tenant
  -- can update if it changed since notice. May be pre-filled from
  -- tenants.forwarding_* but stored independently here for legal record.
  forwarding_street_address text,
  forwarding_unit text,
  forwarding_city text,
  forwarding_state text,
  forwarding_postal_code text,

  -- Legal deadline tracking. Computed at finalize time from
  -- state_rent_rules.security_deposit_return_days for the property's
  -- state. Snapshotted onto the row so future audits don't depend on
  -- the rule changing.
  state_return_days int,
  legal_deadline_date date,

  -- Mailing record
  mail_method security_deposit_mail_method,
  mail_tracking_number text,
  mailed_at timestamptz,

  -- Free-form notes (private to landlord — not on the PDF unless
  -- explicitly added to the cover letter)
  notes text,

  finalized_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index security_deposit_settlements_owner_idx
  on public.security_deposit_settlements (owner_id) where deleted_at is null;
create index security_deposit_settlements_lease_idx
  on public.security_deposit_settlements (lease_id) where deleted_at is null;

alter table public.security_deposit_settlements enable row level security;

create policy "owner can select own settlements"
  on public.security_deposit_settlements for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own settlements"
  on public.security_deposit_settlements for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own settlements"
  on public.security_deposit_settlements for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own settlements"
  on public.security_deposit_settlements for delete to authenticated
  using (owner_id = auth.uid());

create trigger set_updated_at before update on public.security_deposit_settlements
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Deduction line items
-- ------------------------------------------------------------

create table public.security_deposit_deduction_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.security_deposit_settlements(id) on delete cascade,

  category security_deposit_deduction_category not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),

  -- If this deduction was auto-suggested from a move-out inspection
  -- item, link it back. Null means the landlord added it manually.
  inspection_item_id uuid references public.inspection_items(id) on delete set null,

  -- Photos copied from the linked inspection item, OR uploaded by the
  -- landlord directly. Storage paths in the same bucket convention.
  photos text[] not null default '{}'::text[],

  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index security_deposit_deduction_items_settlement_idx
  on public.security_deposit_deduction_items (settlement_id);

alter table public.security_deposit_deduction_items enable row level security;

-- Item-level policies check ownership via the parent settlement,
-- same pattern as inspection_items / policy_properties.
create policy "owner can select own deduction items"
  on public.security_deposit_deduction_items for select to authenticated
  using (
    exists (
      select 1 from public.security_deposit_settlements s
      where s.id = security_deposit_deduction_items.settlement_id
        and s.owner_id = auth.uid()
    )
  );
create policy "owner can insert own deduction items"
  on public.security_deposit_deduction_items for insert to authenticated
  with check (
    exists (
      select 1 from public.security_deposit_settlements s
      where s.id = security_deposit_deduction_items.settlement_id
        and s.owner_id = auth.uid()
    )
  );
create policy "owner can update own deduction items"
  on public.security_deposit_deduction_items for update to authenticated
  using (
    exists (
      select 1 from public.security_deposit_settlements s
      where s.id = security_deposit_deduction_items.settlement_id
        and s.owner_id = auth.uid()
    )
  );
create policy "owner can delete own deduction items"
  on public.security_deposit_deduction_items for delete to authenticated
  using (
    exists (
      select 1 from public.security_deposit_settlements s
      where s.id = security_deposit_deduction_items.settlement_id
        and s.owner_id = auth.uid()
    )
  );

create trigger set_updated_at before update on public.security_deposit_deduction_items
  for each row execute procedure public.set_updated_at();
