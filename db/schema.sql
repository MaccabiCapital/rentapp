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

create type expense_category as enum (
  'advertising',
  'cleaning_maintenance',
  'commissions',
  'insurance',
  'legal_professional',
  'management_fees',
  'mortgage_interest',
  'other_interest',
  'repairs',
  'supplies',
  'taxes',
  'utilities',
  'depreciation',
  'other'
);

create type team_role as enum (
  'accountant',
  'maintenance',
  'locksmith',
  'plumber',
  'electrician',
  'hvac',
  'landscaper',
  'cleaning',
  'lawyer',
  'paralegal',
  'insurance_agent',
  'real_estate_agent',
  'inspector',
  'contractor',
  'sheriff_office',
  'property_manager',
  'other'
);

create type preferred_contact_method as enum (
  'email',
  'phone',
  'text'
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
  photos text[] default '{}',              -- Sprint 10 hero/gallery photos
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
  tenant_notice_given_on date,            -- when tenant said they're leaving
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
create index leases_notice_idx on public.leases (tenant_notice_given_on) where deleted_at is null and tenant_notice_given_on is not null;

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
  deleted_at timestamptz,                 -- soft-delete kept for fair-housing audit trail
  converted_to_tenant_id uuid references public.tenants(id) on delete set null
);

create index prospects_owner_idx on public.prospects (owner_id) where deleted_at is null;
create index prospects_owner_active_idx on public.prospects (owner_id) where deleted_at is null;
create index prospects_unit_idx on public.prospects (unit_id);
create index prospects_stage_idx on public.prospects (stage);

-- ------------------------------------------------------------
-- expenses — non-maintenance expenses (Sprint 7)
-- ------------------------------------------------------------
-- Schedule E-aligned categories so the Financials sprint can do
-- per-category rollups and CSV export for tax time. Ties to
-- properties (not units) because most landlord expenses are at
-- the property level. Per-unit allocation is deferred.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  category expense_category not null,
  amount numeric(12,2) not null check (amount > 0),
  incurred_on date not null,
  vendor text,
  description text,
  notes text,
  receipt_url text,                         -- future: storage bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index expenses_owner_idx on public.expenses (owner_id) where deleted_at is null;
create index expenses_property_idx on public.expenses (property_id) where deleted_at is null;
create index expenses_category_idx on public.expenses (category) where deleted_at is null;
create index expenses_incurred_on_idx on public.expenses (incurred_on) where deleted_at is null;

-- ------------------------------------------------------------
-- team_members — vendor/contractor directory (Sprint 8)
-- ------------------------------------------------------------
-- "My Team": accountant, plumber, lawyer, insurance agent, etc.
-- Wired into maintenance and expenses via a typeahead picker so
-- the landlord can fire off work orders and auto-link expenses
-- to the right person. Cost rollups are denormalized into
-- total_spend_ytd so list views don't need per-row joins.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  full_name text,
  company_name text,

  role team_role not null,
  is_primary boolean not null default false,
  is_active boolean not null default true,

  email text,
  phone text,
  alt_phone text,
  preferred_contact preferred_contact_method not null default 'phone',

  license_number text,
  license_state text,

  hourly_rate numeric(10,2),
  rate_notes text,

  specialty text,
  available_24_7 boolean not null default false,

  last_used_on date,
  total_jobs_ytd int not null default 0,
  total_spend_ytd numeric(12,2) not null default 0,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint team_member_name_required check (
    coalesce(nullif(trim(full_name), ''), nullif(trim(company_name), '')) is not null
  )
);

create index team_members_owner_idx on public.team_members (owner_id) where deleted_at is null;
create index team_members_role_idx on public.team_members (role) where deleted_at is null;
create index team_members_active_idx on public.team_members (owner_id, is_active) where deleted_at is null;

-- ------------------------------------------------------------
-- insurance_policies — landlord policies (Sprint 12)
-- ------------------------------------------------------------
-- One policy can cover multiple properties via policy_properties
-- junction. Umbrella and bundled policies work without
-- duplicated rows.
create type policy_type as enum (
  'landlord',
  'umbrella',
  'flood',
  'earthquake',
  'rent_loss',
  'other'
);

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,
  carrier text not null,
  policy_number text,
  policy_type policy_type not null default 'landlord',
  coverage_amount numeric(12,2),
  liability_limit numeric(12,2),
  annual_premium numeric(10,2),
  deductible numeric(10,2),
  effective_date date,
  expiry_date date not null,
  renewal_date date,
  auto_renewal boolean not null default false,
  notes text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index insurance_owner_idx on public.insurance_policies (owner_id) where deleted_at is null;
create index insurance_expiry_idx on public.insurance_policies (expiry_date) where deleted_at is null;
create index insurance_type_idx on public.insurance_policies (policy_type) where deleted_at is null;
create index insurance_team_idx on public.insurance_policies (team_member_id) where deleted_at is null;

create table public.policy_properties (
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  primary key (policy_id, property_id)
);

create index policy_properties_property_idx on public.policy_properties (property_id);

-- ------------------------------------------------------------
-- rent_schedules — expected rent lines per lease (Sprint 12 B)
-- ------------------------------------------------------------
-- Generated on-demand when /dashboard/rent loads. Unique per
-- (lease, due_date) so repeat generation is idempotent.
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
  method text,
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

-- ------------------------------------------------------------
-- communications — polymorphic activity log (Sprint 13a)
-- ------------------------------------------------------------
-- Entity_type + entity_id pattern. The comm_entity_owned_by()
-- helper function enforces that the pointed-to entity belongs to
-- auth.uid() so we can't log against another landlord's tenant.
create type comm_entity_type as enum (
  'tenant',
  'prospect',
  'team_member',
  'maintenance_request',
  'lease',
  'triage'
);
create type comm_direction as enum ('inbound', 'outbound');
create type comm_channel as enum ('sms', 'call', 'email', 'whatsapp', 'note');

create table public.communications (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  entity_type  comm_entity_type not null,
  entity_id    uuid not null,
  direction    comm_direction not null,
  channel      comm_channel not null,
  content      text not null,
  external_id  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  created_by   text not null default 'user',
  deleted_at   timestamptz
);

create index communications_timeline_idx
  on public.communications (entity_type, entity_id, created_at desc)
  where deleted_at is null;
create index communications_owner_idx
  on public.communications (owner_id)
  where deleted_at is null;
create index communications_external_id_idx
  on public.communications (external_id)
  where deleted_at is null and external_id is not null;

-- ------------------------------------------------------------
-- landlord_phone_lines — per-landlord SMS/voice lines (Sprint 13b)
-- ------------------------------------------------------------
create type line_type as enum ('leasing', 'support');
create type line_status as enum ('pending', 'active', 'suspended');

create table public.landlord_phone_lines (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  line_type             line_type not null,
  twilio_number         text,
  retell_agent_id       text,
  retell_webhook_secret text,
  status                line_status not null default 'pending',
  a2p_brand_id          text,
  a2p_campaign_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (owner_id, line_type)
);

create index phone_lines_owner_idx on public.landlord_phone_lines (owner_id);
create unique index phone_lines_twilio_number_uidx
  on public.landlord_phone_lines (twilio_number)
  where twilio_number is not null;

-- ------------------------------------------------------------
-- tenant_sms_identities — phone → tenant resolver (Sprint 13b)
-- ------------------------------------------------------------
create table public.tenant_sms_identities (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  phone_number        text not null,
  verified_at         timestamptz,
  verification_method text,
  created_at          timestamptz not null default now(),
  unique (owner_id, phone_number)
);

create index tenant_sms_identities_tenant_idx
  on public.tenant_sms_identities (tenant_id);
create index tenant_sms_identities_phone_idx
  on public.tenant_sms_identities (owner_id, phone_number);

-- ------------------------------------------------------------
-- retell_webhook_events — inbound idempotency + audit (Sprint 13b)
-- ------------------------------------------------------------
create table public.retell_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  event_type    text not null,
  external_id   text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  process_error text,
  unique (owner_id, event_type, external_id)
);

create index retell_webhook_events_unprocessed_idx
  on public.retell_webhook_events (received_at desc)
  where processed_at is null;

-- ------------------------------------------------------------
-- listings — public landing pages for vacant units (Sprint 11)
-- ------------------------------------------------------------
-- Each row is a public-facing landing page URL the landlord can
-- share (Zillow, Craigslist, yard sign QR, etc). Includes a
-- contact form that auto-creates prospects via service role.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  headline_rent numeric(10,2),
  available_on date,
  contact_email text,
  contact_phone text,
  is_active boolean not null default true,
  view_count int not null default 0,
  inquiry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index listings_owner_idx on public.listings (owner_id) where deleted_at is null;
create index listings_unit_idx on public.listings (unit_id) where deleted_at is null;
create index listings_slug_idx on public.listings (slug) where deleted_at is null;
create index listings_active_idx on public.listings (is_active) where deleted_at is null;

-- ------------------------------------------------------------
-- state_rent_rules + changelog — compliance knowledge base (Sprint 9.A)
-- ------------------------------------------------------------
-- System-managed reference data: one row per US state with
-- rent caps, notice requirements, deposit rules, etc. Not
-- per-user. RLS allows every authenticated user to read but
-- writes come from migrations/admin scripts only.

create table public.state_rent_rules (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  state_name text not null,
  max_annual_increase_percent numeric(5,2),
  max_annual_increase_formula text,
  has_statewide_cap boolean not null default false,
  increase_notice_days int,
  no_cause_termination_notice_days int,
  tenant_notice_days int,
  security_deposit_max_months numeric(3,1),
  security_deposit_return_days int,
  late_fee_max_percent numeric(5,2),
  late_fee_grace_days_min int,
  eviction_cure_period_days int,
  has_city_rent_control boolean not null default false,
  city_rent_control_note text,
  source_url text,
  source_title text,
  effective_date date,
  last_verified_on date,
  verified_by text,
  is_researched boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index state_rent_rules_state_idx on public.state_rent_rules (state);

create table public.state_rent_rules_changelog (
  id uuid primary key default gen_random_uuid(),
  state_rule_id uuid not null references public.state_rent_rules(id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by text not null,
  change_type text not null,
  field_changes jsonb,
  source_url text,
  notes text
);

create index state_rent_rules_changelog_state_idx on public.state_rent_rules_changelog (state_rule_id);
create index state_rent_rules_changelog_time_idx on public.state_rent_rules_changelog (changed_at desc);

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
alter table public.expenses enable row level security;
alter table public.team_members enable row level security;
alter table public.state_rent_rules enable row level security;
alter table public.state_rent_rules_changelog enable row level security;
alter table public.listings enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.policy_properties enable row level security;
alter table public.rent_schedules enable row level security;
alter table public.communications enable row level security;
alter table public.landlord_phone_lines enable row level security;
alter table public.tenant_sms_identities enable row level security;
alter table public.retell_webhook_events enable row level security;

-- Reference data: any authenticated user can read; no app-side
-- write policies because writes come from migrations only.
create policy "authenticated can select state rules"
  on public.state_rent_rules for select to authenticated using (true);
create policy "authenticated can select changelog"
  on public.state_rent_rules_changelog for select to authenticated using (true);

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

-- Expenses
create policy "owner can select own expenses"
  on public.expenses for select using (owner_id = auth.uid());
create policy "owner can insert own expenses"
  on public.expenses for insert with check (owner_id = auth.uid());
create policy "owner can update own expenses"
  on public.expenses for update using (owner_id = auth.uid());
create policy "owner can delete own expenses"
  on public.expenses for delete using (owner_id = auth.uid());

-- Team members
create policy "owner can select own team"
  on public.team_members for select using (owner_id = auth.uid());
create policy "owner can insert own team"
  on public.team_members for insert with check (owner_id = auth.uid());
create policy "owner can update own team"
  on public.team_members for update using (owner_id = auth.uid());
create policy "owner can delete own team"
  on public.team_members for delete using (owner_id = auth.uid());

-- Listings (owner CRUD + public SELECT for active listings)
create policy "owner can select own listings"
  on public.listings for select to authenticated using (owner_id = auth.uid());
create policy "owner can insert own listings"
  on public.listings for insert to authenticated with check (owner_id = auth.uid());
create policy "owner can update own listings"
  on public.listings for update to authenticated using (owner_id = auth.uid());
create policy "owner can delete own listings"
  on public.listings for delete to authenticated using (owner_id = auth.uid());
create policy "public can select active listings"
  on public.listings for select to anon, authenticated
  using (is_active = true and deleted_at is null);

-- Insurance policies (Sprint 12)
create policy "owner can select own insurance"
  on public.insurance_policies for select to authenticated using (owner_id = auth.uid());
create policy "owner can insert own insurance"
  on public.insurance_policies for insert to authenticated with check (owner_id = auth.uid());
create policy "owner can update own insurance"
  on public.insurance_policies for update to authenticated using (owner_id = auth.uid());
create policy "owner can delete own insurance"
  on public.insurance_policies for delete to authenticated using (owner_id = auth.uid());

-- Policy-to-property junction. Access is gated by ownership of the
-- parent policy (and, for inserts, ownership of the property too so
-- a user can't attach someone else's property to their own policy).
create policy "owner can select own policy_properties"
  on public.policy_properties for select to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
  );
create policy "owner can insert own policy_properties"
  on public.policy_properties for insert to authenticated
  with check (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.properties pr
      where pr.id = policy_properties.property_id
        and pr.owner_id = auth.uid()
    )
  );
create policy "owner can delete own policy_properties"
  on public.policy_properties for delete to authenticated
  using (
    exists (
      select 1 from public.insurance_policies p
      where p.id = policy_properties.policy_id
        and p.owner_id = auth.uid()
    )
  );

-- Rent schedules (Sprint 12 B)
create policy "owner can select own rent_schedules"
  on public.rent_schedules for select to authenticated using (owner_id = auth.uid());
create policy "owner can insert own rent_schedules"
  on public.rent_schedules for insert to authenticated with check (owner_id = auth.uid());
create policy "owner can update own rent_schedules"
  on public.rent_schedules for update to authenticated using (owner_id = auth.uid());
create policy "owner can delete own rent_schedules"
  on public.rent_schedules for delete to authenticated using (owner_id = auth.uid());

-- Communications (Sprint 13a) — polymorphic, so inserts are gated
-- by a helper that validates the pointed-to entity is owned by
-- the caller. Prevents logging against another landlord's tenant.
create or replace function public.comm_entity_owned_by(
  p_entity_type comm_entity_type,
  p_entity_id   uuid,
  p_owner_id    uuid
) returns boolean
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select case p_entity_type
    when 'tenant' then exists (
      select 1 from public.tenants
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'prospect' then exists (
      select 1 from public.prospects
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'team_member' then exists (
      select 1 from public.team_members
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'maintenance_request' then exists (
      select 1 from public.maintenance_requests
      where id = p_entity_id and owner_id = p_owner_id
    )
    when 'lease' then exists (
      select 1 from public.leases
      where id = p_entity_id and owner_id = p_owner_id and deleted_at is null
    )
    when 'triage' then p_entity_id = p_owner_id
  end
$$;

create policy "owner can select own communications"
  on public.communications for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own communications"
  on public.communications for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.comm_entity_owned_by(entity_type, entity_id, auth.uid())
  );
create policy "owner can update own communications"
  on public.communications for update to authenticated
  using (owner_id = auth.uid());
create policy "owner can delete own communications"
  on public.communications for delete to authenticated
  using (owner_id = auth.uid());

-- Landlord phone lines (Sprint 13b) — no delete policy; suspend
-- instead so audit survives.
create policy "owner can select own phone lines"
  on public.landlord_phone_lines for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own phone lines"
  on public.landlord_phone_lines for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner can update own phone lines"
  on public.landlord_phone_lines for update to authenticated
  using (owner_id = auth.uid());

-- Tenant SMS identities (Sprint 13b)
create policy "owner can select own sms identities"
  on public.tenant_sms_identities for select to authenticated
  using (owner_id = auth.uid());
create policy "owner can insert own sms identities"
  on public.tenant_sms_identities for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.tenants
      where id = tenant_id and owner_id = auth.uid() and deleted_at is null
    )
  );
create policy "owner can delete own sms identities"
  on public.tenant_sms_identities for delete to authenticated
  using (owner_id = auth.uid());

-- retell_webhook_events intentionally has no policies. All access
-- goes through the service role client from the webhook route.

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
create trigger set_updated_at before update on public.expenses
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.team_members
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.state_rent_rules
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.listings
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.insurance_policies
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.rent_schedules
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.landlord_phone_lines
  for each row execute procedure public.set_updated_at();

-- Auto-deactivate a unit's listings when the unit becomes occupied
create or replace function public.deactivate_listings_on_occupancy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'occupied' and (old.status is distinct from 'occupied') then
    update public.listings
      set is_active = false
      where unit_id = new.id
        and is_active = true
        and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger deactivate_listings_on_unit_occupancy
  after update on public.units
  for each row execute procedure public.deactivate_listings_on_occupancy();
