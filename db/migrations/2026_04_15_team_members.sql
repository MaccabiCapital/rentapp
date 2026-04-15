-- ============================================================
-- Sprint 8 — My Team (vendor/contractor directory)
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Creates the team_members table + team_role enum + RLS so
-- landlords can store their accountant, plumber, lawyer, etc,
-- and wire them into maintenance/expenses via typeahead pickers.

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

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- identity (at least one of full_name / company_name required,
  -- enforced in Zod on the app side)
  full_name text,
  company_name text,

  -- classification
  role team_role not null,
  is_primary boolean not null default false,
  is_active boolean not null default true,

  -- contact
  email text,
  phone text,
  alt_phone text,
  preferred_contact preferred_contact_method not null default 'phone',

  -- credentials (mainly for lawyers, contractors, inspectors)
  license_number text,
  license_state text,

  -- pricing (free-form so landlords can paste "$150/hr" or
  -- "call for quote", we don't parse it)
  hourly_rate numeric(10,2),
  rate_notes text,

  -- availability + specialty
  specialty text,
  available_24_7 boolean not null default false,

  -- usage tracking (denormalized so list views don't need joins)
  last_used_on date,
  total_jobs_ytd int not null default 0,
  total_spend_ytd numeric(12,2) not null default 0,

  -- misc
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint team_member_name_required check (
    coalesce(nullif(trim(full_name), ''), nullif(trim(company_name), '')) is not null
  )
);

create index team_members_owner_idx
  on public.team_members (owner_id)
  where deleted_at is null;
create index team_members_role_idx
  on public.team_members (role)
  where deleted_at is null;
create index team_members_active_idx
  on public.team_members (owner_id, is_active)
  where deleted_at is null;

alter table public.team_members enable row level security;

create policy "owner can select own team"
  on public.team_members for select using (owner_id = auth.uid());
create policy "owner can insert own team"
  on public.team_members for insert with check (owner_id = auth.uid());
create policy "owner can update own team"
  on public.team_members for update using (owner_id = auth.uid());
create policy "owner can delete own team"
  on public.team_members for delete using (owner_id = auth.uid());

create trigger set_updated_at before update on public.team_members
  for each row execute procedure public.set_updated_at();
