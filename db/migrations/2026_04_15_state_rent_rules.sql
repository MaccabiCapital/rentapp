-- ============================================================
-- Sprint 9.A — State rent rules knowledge base
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Creates state_rent_rules (one row per US state) and a
-- state_rent_rules_changelog audit table. Rules are NOT legal
-- advice — they're reference data surfaced alongside the renewal
-- form with big disclaimers. See app/ui/compliance-disclaimer.tsx
-- for the rendered warning.
--
-- last_verified_on drives the "stale data" banner: anything
-- older than 90 days is marked amber, older than 180 days red.

create table public.state_rent_rules (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,                 -- 2-letter USPS code
  state_name text not null,

  -- The headline number: max annual rent increase percent (null
  -- means no cap, free-market state). The formula is the human-
  -- readable description (e.g. "CPI + 5%, capped at 10%").
  max_annual_increase_percent numeric(5,2),
  max_annual_increase_formula text,
  has_statewide_cap boolean not null default false,

  -- Notice requirements (days)
  increase_notice_days int,                   -- notice before raising rent
  no_cause_termination_notice_days int,       -- days notice to end tenancy no-cause
  tenant_notice_days int,                     -- days notice tenant must give to vacate

  -- Security deposit rules
  security_deposit_max_months numeric(3,1),   -- e.g. 2.0 = max 2 months' rent
  security_deposit_return_days int,           -- days to return after move-out

  -- Late fees
  late_fee_max_percent numeric(5,2),
  late_fee_grace_days_min int,

  -- Eviction basics
  eviction_cure_period_days int,              -- pay-or-quit notice days

  -- City-level rules? (boolean flag, city detail in Sprint 9.B)
  has_city_rent_control boolean not null default false,
  city_rent_control_note text,

  -- Metadata
  source_url text,                            -- official state handbook link
  source_title text,
  effective_date date,
  last_verified_on date,
  verified_by text,                           -- attorney name or "Rentbase Research"

  is_researched boolean not null default false, -- true for the 10 MVP states

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index state_rent_rules_state_idx on public.state_rent_rules (state);

-- Changelog: append-only audit trail of every rule update. Lets
-- the monthly refresh worker prove that data was reviewed.
create table public.state_rent_rules_changelog (
  id uuid primary key default gen_random_uuid(),
  state_rule_id uuid not null references public.state_rent_rules(id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by text not null,                   -- user_id or "rentbase-research" or "agent:cep"
  change_type text not null,                  -- 'create' | 'update' | 'verify' | 'flag'
  field_changes jsonb,                        -- {field: {old, new}}
  source_url text,
  notes text
);

create index state_rent_rules_changelog_state_idx on public.state_rent_rules_changelog (state_rule_id);
create index state_rent_rules_changelog_time_idx on public.state_rent_rules_changelog (changed_at desc);

-- This table is system-managed reference data, not per-user.
-- RLS: allow every authenticated user to SELECT, but only the
-- service role can write (which we do via migrations + admin
-- scripts, never from the app).
alter table public.state_rent_rules enable row level security;
create policy "authenticated can select state rules"
  on public.state_rent_rules for select
  to authenticated
  using (true);

alter table public.state_rent_rules_changelog enable row level security;
create policy "authenticated can select changelog"
  on public.state_rent_rules_changelog for select
  to authenticated
  using (true);

-- updated_at trigger
create trigger set_updated_at before update on public.state_rent_rules
  for each row execute procedure public.set_updated_at();
