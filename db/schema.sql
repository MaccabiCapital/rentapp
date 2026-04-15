-- ============================================================
-- rentapp / Rentbase — initial database schema
-- ============================================================
--
-- Target: Supabase Postgres
-- Apply: run this file in the Supabase SQL editor, or via
--   supabase db push once the CLI is wired up.
--
-- Conventions:
--   - All user-owned tables include owner_id UUID REFERENCES auth.users
--   - Row Level Security (RLS) enabled on every user-facing table
--   - Policies enforce owner_id = auth.uid() for isolation
--   - Soft deletes via deleted_at timestamp (never hard delete user data)
--   - Timestamps in TIMESTAMPTZ
--
-- Product-outline reference: `03-artifacts/product-outline.md`
-- (in the cep-ventures Round 4 artifact set)
--
-- ============================================================

-- ------------------------------------------------------------
-- Enum types
-- ------------------------------------------------------------

create type unit_status as enum (
  'occupied',
  'vacant',
  'pending',         -- lease signed, awaiting move-in
  'notice_given'     -- tenant has given notice, countdown to vacancy
);

create type lease_status as enum (
  'draft',
  'active',
  'expired',
  'terminated',
  'renewed'
);

create type payment_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partial'
);

create type maintenance_status as enum (
  'open',
  'in_progress',
  'awaiting_parts',
  'resolved',
  'closed'
);

create type prospect_stage as enum (
  'inquired',
  'application_sent',
  'application_received',
  'screening',
  'approved',
  'lease_signed',
  'declined',
  'withdrew'
);

-- ------------------------------------------------------------
-- properties — top-level building/location record
-- ------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  property_type text,                     -- 'single_family', 'duplex', 'triplex', 'apartment_building', etc.
  year_built int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index properties_owner_idx on public.properties (owner_id) where deleted_at is null;

-- ------------------------------------------------------------
-- units — individual rentable units, belong to a property
-- ------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_number text,                       -- '1A', '2B', null for single-family
  bedrooms int,
  bathrooms numeric(3,1),                 -- 1.0, 1.5, 2.0 etc.
  square_feet int,
  monthly_rent numeric(10,2),
  security_deposit numeric(10,2),
  status unit_status not null default 'vacant',
  amenities text[] default '{}',
  photos text[] default '{}',             -- array of storage URLs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index units_owner_idx on public.units (owner_id) where deleted_at is null;
create index units_property_idx on public.units (property_id) where deleted_at is null;
create index units_status_idx on public.units (status) where deleted_at is null;

-- ------------------------------------------------------------
-- tenants — people who rent units
-- ------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tenants_owner_idx on public.tenants (owner_id) where deleted_at is null;
create index tenants_email_idx on public.tenants (email) where deleted_at is null;

-- ------------------------------------------------------------
-- leases — tenant-unit relationships with lease terms
-- ------------------------------------------------------------
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  status lease_status not null default 'draft',
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(10,2) not null,
  security_deposit numeric(10,2),
  rent_due_day int not null default 1,    -- day of month rent is due
  late_fee_amount numeric(10,2),
  late_fee_grace_days int default 5,
  document_url text,                      -- signed lease PDF in storage
  signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index leases_owner_idx on public.leases (owner_id) where deleted_at is null;
create index leases_unit_idx on public.leases (unit_id) where deleted_at is null;
create index leases_tenant_idx on public.leases (tenant_id) where deleted_at is null;
create index leases_status_idx on public.leases (status) where deleted_at is null;
create index leases_end_date_idx on public.leases (end_date) where deleted_at is null;

-- ------------------------------------------------------------
-- payments — rent payment records
-- ------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  due_date date not null,
  paid_at timestamptz,
  payment_method text,                    -- 'ach', 'card', 'check', 'cash', 'zelle'
  stripe_payment_intent_id text,          -- null for non-Stripe payments
  late_fee_applied numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_owner_idx on public.payments (owner_id);
create index payments_lease_idx on public.payments (lease_id);
create index payments_status_idx on public.payments (status);
create index payments_due_date_idx on public.payments (due_date);

-- ------------------------------------------------------------
-- maintenance_requests — tenant-reported maintenance tickets
-- ------------------------------------------------------------
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  title text not null,
  description text,
  urgency text default 'normal',          -- 'low', 'normal', 'high', 'emergency'
  status maintenance_status not null default 'open',
  photos text[] default '{}',
  assigned_to text,                       -- vendor name or 'self'
  cost_materials numeric(10,2),
  cost_labor numeric(10,2),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_owner_idx on public.maintenance_requests (owner_id);
create index maintenance_unit_idx on public.maintenance_requests (unit_id);
create index maintenance_status_idx on public.maintenance_requests (status);

-- ------------------------------------------------------------
-- prospects — pipeline of people interested in renting a vacant unit
-- ------------------------------------------------------------
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  phone text,
  stage prospect_stage not null default 'inquired',
  source text,                            -- 'zillow', 'craigslist', 'referral', 'landing_page', etc.
  inquiry_message text,
  follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_to_tenant_id uuid references public.tenants(id) on delete set null
);

create index prospects_owner_idx on public.prospects (owner_id);
create index prospects_unit_idx on public.prospects (unit_id);
create index prospects_stage_idx on public.prospects (stage);

-- ------------------------------------------------------------
-- Row Level Security policies
-- ------------------------------------------------------------
-- Every table has the same policy: a row is only visible/mutable
-- by the authenticated user whose id matches owner_id.
-- ------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.prospects enable row level security;

-- Properties
create policy "owner can select own properties"
  on public.properties for select using (owner_id = auth.uid());
create policy "owner can insert own properties"
  on public.properties for insert with check (owner_id = auth.uid());
create policy "owner can update own properties"
  on public.properties for update using (owner_id = auth.uid());
create policy "owner can delete own properties"
  on public.properties for delete using (owner_id = auth.uid());

-- Units
create policy "owner can select own units"
  on public.units for select using (owner_id = auth.uid());
create policy "owner can insert own units"
  on public.units for insert with check (owner_id = auth.uid());
create policy "owner can update own units"
  on public.units for update using (owner_id = auth.uid());
create policy "owner can delete own units"
  on public.units for delete using (owner_id = auth.uid());

-- Tenants
create policy "owner can select own tenants"
  on public.tenants for select using (owner_id = auth.uid());
create policy "owner can insert own tenants"
  on public.tenants for insert with check (owner_id = auth.uid());
create policy "owner can update own tenants"
  on public.tenants for update using (owner_id = auth.uid());
create policy "owner can delete own tenants"
  on public.tenants for delete using (owner_id = auth.uid());

-- Leases
create policy "owner can select own leases"
  on public.leases for select using (owner_id = auth.uid());
create policy "owner can insert own leases"
  on public.leases for insert with check (owner_id = auth.uid());
create policy "owner can update own leases"
  on public.leases for update using (owner_id = auth.uid());
create policy "owner can delete own leases"
  on public.leases for delete using (owner_id = auth.uid());

-- Payments
create policy "owner can select own payments"
  on public.payments for select using (owner_id = auth.uid());
create policy "owner can insert own payments"
  on public.payments for insert with check (owner_id = auth.uid());
create policy "owner can update own payments"
  on public.payments for update using (owner_id = auth.uid());
create policy "owner can delete own payments"
  on public.payments for delete using (owner_id = auth.uid());

-- Maintenance requests
create policy "owner can select own maintenance"
  on public.maintenance_requests for select using (owner_id = auth.uid());
create policy "owner can insert own maintenance"
  on public.maintenance_requests for insert with check (owner_id = auth.uid());
create policy "owner can update own maintenance"
  on public.maintenance_requests for update using (owner_id = auth.uid());
create policy "owner can delete own maintenance"
  on public.maintenance_requests for delete using (owner_id = auth.uid());

-- Prospects
create policy "owner can select own prospects"
  on public.prospects for select using (owner_id = auth.uid());
create policy "owner can insert own prospects"
  on public.prospects for insert with check (owner_id = auth.uid());
create policy "owner can update own prospects"
  on public.prospects for update using (owner_id = auth.uid());
create policy "owner can delete own prospects"
  on public.prospects for delete using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Updated-at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.properties
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.units
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.tenants
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.leases
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_requests
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.prospects
  for each row execute procedure public.set_updated_at();
