-- ============================================================
-- FairScreen — Fair-housing compliance layer
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- 5 tables + audit log + storage bucket.
-- A separate seed migration populates state_fair_housing_rules with
-- the federal baseline + 5 MVP states.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type fh_finding_source as enum (
  'listing_scan',
  'question_audit',
  'outbound_message_scan',
  'inbound_message_scan',
  'disparate_impact',
  'criteria_compliance_check'
);

create type fh_finding_severity as enum (
  'info', 'amber', 'red'
);

create type fh_finding_status as enum (
  'open', 'acknowledged', 'fixed', 'dismissed', 'resolved_external'
);

create type fh_protected_class as enum (
  'race', 'color', 'religion', 'sex_or_gender', 'sexual_orientation',
  'gender_identity', 'national_origin', 'familial_status', 'disability',
  'source_of_income', 'age', 'marital_status', 'military_status',
  'criminal_history', 'immigration_status'
);

create type fh_di_status as enum (
  'pending', 'running', 'complete', 'partial', 'error'
);

-- ------------------------------------------------------------
-- state_fair_housing_rules — global reference data
-- ------------------------------------------------------------

create table public.state_fair_housing_rules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null unique,
  jurisdiction_name text not null,
  protected_classes_added fh_protected_class[] not null default '{}',
  protects_source_of_income boolean not null default false,
  soi_notes text,
  fair_chance_housing_law boolean not null default false,
  fair_chance_notes text,
  max_application_fee_cents int,
  application_fee_notes text,
  required_application_disclosures text[],
  income_multiple_max numeric(3,1),
  income_multiple_notes text,
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

create index state_fair_housing_rules_jurisdiction_idx
  on public.state_fair_housing_rules (jurisdiction);

alter table public.state_fair_housing_rules enable row level security;
create policy "any authed read" on public.state_fair_housing_rules
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at_state_fair_housing_rules
  before update on public.state_fair_housing_rules
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- tenant_selection_criteria
-- ------------------------------------------------------------

create table public.tenant_selection_criteria (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  jurisdiction text not null,
  income_multiple numeric(3,1),
  min_credit_score int,
  max_evictions_lookback_years int,
  max_eviction_count int,
  accepts_section_8 boolean,
  accepts_other_vouchers boolean,
  criminal_history_lookback_years int,
  criminal_history_excludes text[],
  pet_policy text,
  occupancy_max_per_bedroom int default 2,
  additional_requirements text,
  reasonable_accommodations_statement text,
  is_compliant boolean not null default false,
  compliance_findings_count int not null default 0,
  last_scanned_at timestamptz,
  pdf_storage_path text,
  auto_attach_to_new_listings boolean not null default true,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tenant_selection_criteria_owner_idx
  on public.tenant_selection_criteria (owner_id) where deleted_at is null;
create index tenant_selection_criteria_published_idx
  on public.tenant_selection_criteria (owner_id, is_published)
  where deleted_at is null;

alter table public.tenant_selection_criteria enable row level security;
create policy "owners select on tsc" on public.tenant_selection_criteria
  for select using (owner_id = auth.uid());
create policy "owners insert on tsc" on public.tenant_selection_criteria
  for insert with check (owner_id = auth.uid());
create policy "owners update on tsc" on public.tenant_selection_criteria
  for update using (owner_id = auth.uid());
create policy "owners delete on tsc" on public.tenant_selection_criteria
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_tenant_selection_criteria
  before update on public.tenant_selection_criteria
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- criteria_versions — immutable
-- ------------------------------------------------------------

create table public.criteria_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  criteria_id uuid not null references public.tenant_selection_criteria(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  unique (criteria_id, version)
);

create index criteria_versions_owner_idx on public.criteria_versions (owner_id);
create index criteria_versions_criteria_idx on public.criteria_versions (criteria_id);

alter table public.criteria_versions enable row level security;
create policy "owners select on cv" on public.criteria_versions
  for select using (owner_id = auth.uid());
create policy "owners insert on cv" on public.criteria_versions
  for insert with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- compliance_findings — unified across sources
-- ------------------------------------------------------------

create table public.compliance_findings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source fh_finding_source not null,
  severity fh_finding_severity not null,
  status fh_finding_status not null default 'open',
  subject_listing_id uuid references public.listings(id) on delete cascade,
  subject_criteria_id uuid references public.tenant_selection_criteria(id) on delete cascade,
  subject_message_id uuid,
  subject_question_id uuid,
  subject_di_run_id uuid,
  subject_prospect_id uuid references public.prospects(id) on delete cascade,
  title text not null,
  detail text not null,
  trigger_text text,
  suggested_fix text,
  implicated_classes fh_protected_class[] default '{}',
  jurisdiction text not null default 'US',
  rule_id text,
  dismissed_reason text,
  dismissed_at timestamptz,
  dismissed_by uuid references auth.users(id),
  evidence_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_findings_owner_idx on public.compliance_findings (owner_id);
create index compliance_findings_status_idx on public.compliance_findings (owner_id, status);
create index compliance_findings_source_idx on public.compliance_findings (owner_id, source);
create index compliance_findings_severity_idx on public.compliance_findings (owner_id, severity);

alter table public.compliance_findings enable row level security;
create policy "owners select on cf" on public.compliance_findings
  for select using (owner_id = auth.uid());
create policy "owners insert on cf" on public.compliance_findings
  for insert with check (owner_id = auth.uid());
create policy "owners update on cf" on public.compliance_findings
  for update using (owner_id = auth.uid());
create policy "owners delete on cf" on public.compliance_findings
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_compliance_findings
  before update on public.compliance_findings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- disparate_impact_runs
-- ------------------------------------------------------------

create table public.disparate_impact_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status fh_di_status not null default 'pending',
  window_start date not null,
  window_end date not null,
  decisions_total int not null default 0,
  approvals int not null default 0,
  rejections int not null default 0,
  more_info_requests int not null default 0,
  cohort_breakdowns jsonb,
  findings_red int not null default 0,
  findings_amber int not null default 0,
  error_text text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index disparate_impact_runs_owner_idx on public.disparate_impact_runs (owner_id);
create index disparate_impact_runs_window_idx
  on public.disparate_impact_runs (owner_id, window_end desc);

alter table public.disparate_impact_runs enable row level security;
create policy "owners select on dir" on public.disparate_impact_runs
  for select using (owner_id = auth.uid());
create policy "owners insert on dir" on public.disparate_impact_runs
  for insert with check (owner_id = auth.uid());
create policy "owners update on dir" on public.disparate_impact_runs
  for update using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- compliance_audit_log — append-only
-- ------------------------------------------------------------

create table public.compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid references public.compliance_findings(id) on delete set null,
  criteria_id uuid references public.tenant_selection_criteria(id) on delete set null,
  di_run_id uuid references public.disparate_impact_runs(id) on delete set null,
  event text not null,
  event_data jsonb,
  actor_user_id uuid,
  actor_kind text not null,
  created_at timestamptz not null default now()
);

create index compliance_audit_log_owner_idx on public.compliance_audit_log (owner_id);
create index compliance_audit_log_finding_idx on public.compliance_audit_log (finding_id);
create index compliance_audit_log_created_idx
  on public.compliance_audit_log (created_at desc);

alter table public.compliance_audit_log enable row level security;
create policy "owners select on cal" on public.compliance_audit_log
  for select using (owner_id = auth.uid());
create policy "owners insert on cal" on public.compliance_audit_log
  for insert with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Seed: federal baseline + 5 MVP states
-- ------------------------------------------------------------
-- Sourced from public statutes. Marked researched = true with
-- last_verified_on = today. Founder-Q-answered: states are US +
-- CA, NY, TX, FL, WA.
--
-- ATTORNEY REVIEW REQUIRED before public launch — see
-- HANDOFF-FAIRSCREEN.md "attorney" section.

insert into public.state_fair_housing_rules
  (jurisdiction, jurisdiction_name, protected_classes_added,
   protects_source_of_income, soi_notes,
   fair_chance_housing_law, fair_chance_notes,
   max_application_fee_cents, application_fee_notes,
   income_multiple_max, income_multiple_notes,
   source_url, source_title, effective_date, last_verified_on,
   is_researched, notes)
values
  -- US — federal Fair Housing Act baseline
  ('US', 'United States (federal)',
   array['race','color','religion','sex_or_gender',
         'national_origin','familial_status','disability']::fh_protected_class[],
   false, 'No federal source-of-income protection.',
   false, null,
   null, null,
   null, null,
   'https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_act_overview',
   'Fair Housing Act overview (HUD)',
   '1968-04-11', current_date,
   true,
   'Federal baseline. State + city rules add to (never subtract from) these protections. ATTORNEY-REVIEW-PENDING.'),

  -- CA — FEHA + SOI + Fair Chance
  ('CA', 'California',
   array['sexual_orientation','gender_identity','marital_status',
         'military_status','source_of_income','age',
         'criminal_history','immigration_status']::fh_protected_class[],
   true, 'Source of income protected under FEHA. Includes Section 8 vouchers (SB 329) and emergency housing vouchers.',
   true, 'Fair Chance Act (AB 1008) requires conditional-offer-then-individualized-assessment for criminal history.',
   null, 'CA: only actual screening costs may be charged; no fee in excess of actual cost.',
   3.0, 'CA SB 1157 disclosure obligations apply.',
   'https://calcivilrights.ca.gov/housing/',
   'CA Civil Rights Department — Housing',
   '2020-01-01', current_date,
   true,
   'High-protection state. ATTORNEY-REVIEW-PENDING.'),

  -- NY — SOI statewide + lawful occupation
  ('NY', 'New York',
   array['marital_status','source_of_income','age',
         'sexual_orientation','gender_identity','military_status',
         'immigration_status']::fh_protected_class[],
   true, 'Source of income protected statewide (effective April 2019). Includes Section 8.',
   false, 'No statewide ban-the-box for housing. NYC has its own Fair Chance for Housing Act (effective 2024).',
   2000, 'NY caps tenant application fees at $20 (Housing Stability and Tenant Protection Act of 2019).',
   null, null,
   'https://dhr.ny.gov/housing-discrimination',
   'NY Division of Human Rights — Housing',
   '2019-06-14', current_date,
   true,
   'NYC adds further protections (criminal history). ATTORNEY-REVIEW-PENDING.'),

  -- TX — federal-only baseline + age
  ('TX', 'Texas',
   array[]::fh_protected_class[],
   false, 'No statewide source-of-income protection.',
   false, null,
   null, null,
   null, null,
   'https://www.tdhca.texas.gov/fair-housing',
   'Texas Department of Housing and Community Affairs — Fair Housing',
   '1989-09-01', current_date,
   true,
   'Federal baseline only at the state level. Some cities (Austin, Dallas) add SOI. ATTORNEY-REVIEW-PENDING.'),

  -- FL — federal-only baseline + age
  ('FL', 'Florida',
   array[]::fh_protected_class[],
   false, 'No statewide source-of-income protection.',
   false, null,
   null, null,
   null, null,
   'https://fchr.myflorida.com/practice-areas/housing',
   'Florida Commission on Human Relations — Housing',
   '1983-10-01', current_date,
   true,
   'Federal baseline only. Miami-Dade and Broward County add SOI. ATTORNEY-REVIEW-PENDING.'),

  -- WA — SOI + LGBTQ+ + military
  ('WA', 'Washington',
   array['sexual_orientation','gender_identity','marital_status',
         'military_status','source_of_income']::fh_protected_class[],
   true, 'Source of income protected (RCW 59.18.255). Includes Section 8 and emergency housing assistance.',
   false, 'Seattle has Fair Chance Housing Ordinance; statewide does not.',
   null, null,
   null, null,
   'https://www.hum.wa.gov/fair-housing',
   'Washington State Human Rights Commission — Fair Housing',
   '2018-09-30', current_date,
   true,
   'High-protection state. Local ordinances add further protections. ATTORNEY-REVIEW-PENDING.')
on conflict (jurisdiction) do nothing;
