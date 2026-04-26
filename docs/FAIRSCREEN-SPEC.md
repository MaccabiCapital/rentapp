# FairScreen — Fair-Housing Compliance Layer

**Module name in code:** `compliance`
**Sprint:** TBD (insert after `screening` / Proof Check is shipped — they share the audit log pattern and the prospects pipeline)
**Source:** Ideabrowser idea `#3776` ("Screening platform that automates fair housing checks for landlords"). Scored 9/9/8 on opportunity / pain / timing, 6 on builder confidence (state-by-state legal nuance is the hard part). $79–149/mo positioning.

---

## TL;DR

FairScreen is the **process-side** counterpart to Proof Check. Where Proof Check asks *"did this applicant lie?"* (forensics on documents), FairScreen asks *"did the landlord discriminate?"* (audit on the landlord's own behavior).

Five surfaces, one shared rule engine:

1. **Tenant Selection Criteria generator** — wizard that produces a state-specific, FHA-compliant criteria PDF the landlord can hand to every applicant. Defends against disparate-treatment claims by showing every applicant was measured against the same yardstick.
2. **Listing copy scanner** — paste an ad, get flagged terms ("perfect for young professionals", "Christian neighborhood", "able-bodied tenants") with suggested rewrites.
3. **Application question audit** — every custom question a landlord adds to their application form is run through the rule pack before it goes live ("How many kids?" → blocked; suggest "How many occupants?").
4. **Outbound communication scanner** — extends the existing `scanOutboundMessage` from `fair-housing-guardrails.ts` to *persist* findings as durable, exportable rows instead of in-memory flags on `leasing_messages.guardrail_flags`.
5. **Disparate-impact monitor** — nightly cron over the screening audit log + prospect decisions. Surfaces patterns like "you rejected 4 of 5 applicants below $X income but approved 3 of 4 above it" — the kind of pattern that creates lawsuit exposure even when each individual decision was lawful.

This module mounts under the existing **placeholder** `app/dashboard/compliance/page.tsx` (currently just the empty Sprint-0 stub) and expands it into a full Compliance hub. It depends on the same fair-housing safe-harbor pattern codified in `CLAUDE.md` hard rule #4 and on the deterministic-engine discipline established by `app/lib/leasing/fair-housing-guardrails.ts`.

---

## Hard rules — non-negotiable

These are CLAUDE.md hard rule #4 applied to this module. Any implementation that violates them must be reverted, not merged.

1. **The rule pack is deterministic. AI never raises findings.** Same as Proof Check. AI may *summarize* a finding ("This phrase 'family-friendly' implies a familial-status preference") and *suggest* a rewrite, but the finding itself comes from the regex/heuristic rule engine. No LLM is the source of truth for whether a phrase is non-compliant.
2. **Findings are advisory, not blocking.** A landlord can publish a listing or save a question that has flagged findings. We surface a strong warning + a one-click rewrite suggestion, but we never prevent action. The landlord makes the call. (Mirrors the "Approve and Reject always enabled" rule from Proof Check.)
3. **No legal advice.** Every output that references a state-specific rule renders with the existing `app/ui/compliance-disclaimer.tsx` banner. We are surfacing reference data, not practicing law. Last-verified-on dates appear inline; rules older than 90 days show amber, older than 180 days show red — same convention as `state_rent_rules`.
4. **Disparate-impact analysis runs on bias-neutral signals only.** The cohort comparison engine **never** infers protected-class membership from name, address, or any proxy. It compares decisions across **landlord-stated** dimensions (income tier, eviction history, credit band, application order) — measuring the landlord's own consistency, not the applicants' demographics.
5. **Every finding is logged.** One row per scan, per question audit, per disparate-impact run, retained 3+ years. Surfaced in the unified Compliance audit feed (extension of the screening audit page).
6. **Always disclosed.** Every generated criteria PDF carries a fair-housing footer matching the language already used on the leasing-assistant audit log.
7. **Source-of-income protection is on by default.** In jurisdictions that protect SOI (CA, NY, NJ, MA, WA, DC, plus dozens of cities), the rule pack is on. In jurisdictions that don't, the rule is **still on by default** — the landlord must explicitly opt out per criteria document, and that opt-out is itself logged.

If a future feature would weaken any of the above, escalate to the founder before building.

---

## Where it slots into the existing app

| Touch point | What changes |
|---|---|
| `app/dashboard/compliance/page.tsx` | **Replaces** the Sprint-0 stub with a real overview: criteria status tile, listing scans pending, open findings count, last disparate-impact run, "Run new audit" CTA |
| `app/dashboard/compliance/criteria/page.tsx` | **NEW** — list of saved criteria docs, "Create new" wizard entry, version history |
| `app/dashboard/compliance/criteria/[id]/page.tsx` | **NEW** — single criteria doc, editable, downloadable as PDF, attachable to listings |
| `app/dashboard/compliance/listings/page.tsx` | **NEW** — listing scanner UI: paste copy or pick a saved listing, get findings, accept/reject suggested rewrites |
| `app/dashboard/compliance/findings/page.tsx` | **NEW** — unified findings inbox: listing scans, question audits, message scans, DI signals — filterable, exportable |
| `app/dashboard/compliance/disparate-impact/page.tsx` | **NEW** — DI dashboard: cohort breakdowns, last run timestamp, "Run now" button |
| `app/dashboard/compliance/audit/page.tsx` | **NEW** (or merge into screening audit) — append-only event log for compliance actions |
| `app/dashboard/listings/[id]/page.tsx` | New "Scan for fair-housing issues" button + inline findings panel + "Attach criteria document" picker |
| `app/dashboard/leasing-assistant/[id]/page.tsx` | When the existing `scanOutboundMessage` raises an output flag, **also persist** a `compliance_findings` row so it shows in the Compliance findings inbox |
| `app/apply/[slug]/page.tsx` | Renders the attached criteria doc (link + inline) at the top of the application form when present |
| Question editor for custom application questions (currently in `app/dashboard/listings/[id]/...` or its application-builder analog) | Every custom question is run through `validateScreeningQuestion` on save; non-compliant questions are flagged with "Save anyway" / "Edit" buttons |
| `app/dashboard/layout.tsx` (sidebar) | Promote Compliance from placeholder to a full top-level entry with sub-items: Criteria, Listing scans, Findings, Disparate impact, Audit log |

---

## 1. Database

One new migration: `db/migrations/2026_05_XX_compliance.sql`. Five tables.

```sql
-- ============================================================
-- FairScreen — Fair-housing compliance layer
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Five tables:
--   state_fair_housing_rules    — reference data (federal + 5 states for MVP)
--   tenant_selection_criteria   — landlord-authored criteria docs
--   criteria_versions           — immutable version snapshots
--   compliance_findings         — unified findings table (listings, questions, messages, DI)
--   disparate_impact_runs       — nightly cron output
--   compliance_audit_log        — append-only event log

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
  'info',                -- informational, no action needed
  'amber',               -- review recommended
  'red'                  -- material legal exposure
);

create type fh_finding_status as enum (
  'open',                -- never reviewed
  'acknowledged',        -- landlord clicked "I've seen this"
  'fixed',               -- landlord applied the suggested fix
  'dismissed',           -- landlord chose to ignore (logged)
  'resolved_external'    -- attorney review completed offline
);

create type fh_protected_class as enum (
  'race',
  'color',
  'religion',
  'sex_or_gender',
  'sexual_orientation',
  'gender_identity',
  'national_origin',
  'familial_status',
  'disability',
  'source_of_income',
  'age',
  'marital_status',
  'military_status',
  'criminal_history',           -- "ban the box" jurisdictions
  'immigration_status'
);

create type fh_di_status as enum (
  'pending', 'running', 'complete', 'partial', 'error'
);

-- ------------------------------------------------------------
-- state_fair_housing_rules
-- ------------------------------------------------------------
-- One row per jurisdiction. 'US' is the federal baseline (always
-- present). Two-letter state codes for state add-ons. City-level
-- rules deferred to v2 (see "Out of scope").
--
-- Mirrors the layout of state_rent_rules. last_verified_on drives
-- the same 90/180-day stale-data banner.

create table public.state_fair_housing_rules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null unique,         -- 'US' or 2-letter USPS code
  jurisdiction_name text not null,

  -- Which protected classes apply ON TOP OF the federal baseline
  -- in this jurisdiction. The federal row (US) lists the seven
  -- federal classes; each state row lists ONLY its add-ons.
  protected_classes_added fh_protected_class[] not null default '{}',

  -- Source-of-income specifics (because they vary even within
  -- "yes/no" — some states protect HCV but not other vouchers).
  protects_source_of_income boolean not null default false,
  soi_notes text,

  -- Criminal-history "ban the box" / fair-chance housing rules.
  fair_chance_housing_law boolean not null default false,
  fair_chance_notes text,

  -- Application-fee caps (CA: actual cost; NY: $20; etc.)
  max_application_fee_cents int,
  application_fee_notes text,

  -- Required disclosures specific to this jurisdiction.
  required_application_disclosures text[],

  -- Permitted screening criteria language (some states require
  -- specific phrasing for income multiples — e.g. CA SB 1157).
  income_multiple_max numeric(3,1),          -- e.g. 3.0 = 3x rent allowed
  income_multiple_notes text,

  -- Metadata
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

-- This table is global reference data (no owner_id). RLS is
-- read-only for all authenticated users; writes are admin-only.
alter table public.state_fair_housing_rules enable row level security;

create policy "any authed read" on public.state_fair_housing_rules
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at_state_fair_housing_rules
  before update on public.state_fair_housing_rules
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- tenant_selection_criteria
-- ------------------------------------------------------------
-- The landlord's own criteria document. One per portfolio is
-- typical, but multiple are supported (e.g. different criteria
-- for studios vs 3-bedrooms is permitted, as long as it's
-- consistently applied).

create table public.tenant_selection_criteria (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,                        -- "Default criteria — Atlanta portfolio"
  jurisdiction text not null,                -- which state rule pack applies

  -- Criteria fields (all are landlord-set; the engine's job is
  -- to flag anything illegal in the chosen jurisdiction).
  income_multiple numeric(3,1),              -- e.g. 3.0 = require 3x rent
  min_credit_score int,
  max_evictions_lookback_years int,
  max_eviction_count int,
  accepts_section_8 boolean,                 -- forced true in SOI-protected jurisdictions
  accepts_other_vouchers boolean,
  criminal_history_lookback_years int,
  criminal_history_excludes text[],          -- categories the landlord excludes
  pet_policy text,                           -- service animals/ESAs always exempt
  occupancy_max_per_bedroom int default 2,   -- HUD-recommended baseline

  -- Free-text fields (scanned for compliance issues at save time)
  additional_requirements text,
  reasonable_accommodations_statement text,  -- defaults to a compliant template

  -- Compliance status from the engine
  is_compliant boolean not null default false,
  compliance_findings_count int not null default 0,
  last_scanned_at timestamptz,

  -- The current rendered PDF lives in storage; storage_path is
  -- regenerated every time the criteria are edited.
  pdf_storage_path text,

  -- Whether to auto-attach to all listings owned by this user
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

create policy "owners select" on public.tenant_selection_criteria
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.tenant_selection_criteria
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.tenant_selection_criteria
  for update using (owner_id = auth.uid());
create policy "owners delete" on public.tenant_selection_criteria
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_tenant_selection_criteria
  before update on public.tenant_selection_criteria
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- criteria_versions
-- ------------------------------------------------------------
-- Every save creates a new immutable version. This is the audit
-- trail that proves "this is the criteria I was using when I
-- decided on Applicant Smith on date X."

create table public.criteria_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  criteria_id uuid not null references public.tenant_selection_criteria(id) on delete cascade,

  version int not null,                      -- monotonic per criteria_id
  snapshot jsonb not null,                   -- full criteria record at save time
  pdf_storage_path text,                     -- frozen PDF for this version

  created_at timestamptz not null default now(),

  unique (criteria_id, version)
);

create index criteria_versions_owner_idx on public.criteria_versions (owner_id);
create index criteria_versions_criteria_idx on public.criteria_versions (criteria_id);

alter table public.criteria_versions enable row level security;

create policy "owners select" on public.criteria_versions
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.criteria_versions
  for insert with check (owner_id = auth.uid());
-- No update/delete: versions are immutable.

-- ------------------------------------------------------------
-- compliance_findings
-- ------------------------------------------------------------
-- The unified findings table — every scan, every audit, every
-- DI signal lives here. Polymorphic via `source` + `subject_*`
-- columns. Mirrors the screening_signals shape but cross-domain.

create table public.compliance_findings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  source fh_finding_source not null,
  severity fh_finding_severity not null,
  status fh_finding_status not null default 'open',

  -- Polymorphic subject — one of these is non-null based on source.
  subject_listing_id uuid references public.listings(id) on delete cascade,
  subject_criteria_id uuid references public.tenant_selection_criteria(id) on delete cascade,
  subject_message_id uuid,                   -- references leasing_messages.id (no FK to allow soft-delete)
  subject_question_id uuid,                  -- references the application question store
  subject_di_run_id uuid,                    -- references disparate_impact_runs.id
  subject_prospect_id uuid references public.prospects(id) on delete cascade,

  -- Plain-English title shown in lists.
  title text not null,

  -- Longer explanation (the why) shown when expanded.
  detail text not null,

  -- The exact phrase / question / pattern that triggered the finding.
  trigger_text text,

  -- Suggested rewrite, alternative question, or remediation step.
  suggested_fix text,

  -- Which protected class(es) this finding implicates.
  implicated_classes fh_protected_class[] default '{}',

  -- Which jurisdiction's rule was violated. 'US' for federal.
  jurisdiction text not null default 'US',
  rule_id text,                              -- stable rule identifier from the rule pack

  -- For dismissed findings, why.
  dismissed_reason text,
  dismissed_at timestamptz,
  dismissed_by uuid references auth.users(id),

  evidence_json jsonb,                       -- internal — raw scanner output

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_findings_owner_idx on public.compliance_findings (owner_id);
create index compliance_findings_status_idx on public.compliance_findings (owner_id, status);
create index compliance_findings_source_idx on public.compliance_findings (owner_id, source);
create index compliance_findings_severity_idx on public.compliance_findings (owner_id, severity);

alter table public.compliance_findings enable row level security;

create policy "owners select" on public.compliance_findings
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.compliance_findings
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.compliance_findings
  for update using (owner_id = auth.uid());
create policy "owners delete" on public.compliance_findings
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_compliance_findings
  before update on public.compliance_findings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- disparate_impact_runs
-- ------------------------------------------------------------
-- One row per nightly cron run, per landlord. Stores the cohort
-- breakdown the engine computed and any patterns it surfaced.

create table public.disparate_impact_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  status fh_di_status not null default 'pending',

  -- The window analyzed.
  window_start date not null,
  window_end date not null,

  -- Inputs counted in this run.
  decisions_total int not null default 0,
  approvals int not null default 0,
  rejections int not null default 0,
  more_info_requests int not null default 0,

  -- Cohort dimensions analyzed (income band, credit band, eviction
  -- history yes/no, application-order percentile, etc.). Stored
  -- as a JSON object for flexibility.
  cohort_breakdowns jsonb,

  -- Findings produced by THIS run, by severity.
  findings_red int not null default 0,
  findings_amber int not null default 0,

  -- For partial / error runs, what failed.
  error_text text,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index disparate_impact_runs_owner_idx on public.disparate_impact_runs (owner_id);
create index disparate_impact_runs_window_idx on public.disparate_impact_runs (owner_id, window_end desc);

alter table public.disparate_impact_runs enable row level security;

create policy "owners select" on public.disparate_impact_runs
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.disparate_impact_runs
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.disparate_impact_runs
  for update using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- compliance_audit_log
-- ------------------------------------------------------------
-- Append-only. Same shape as screening_audit_log so the two can
-- be UNION-queried for the unified Compliance audit page.

create table public.compliance_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  finding_id uuid references public.compliance_findings(id) on delete set null,
  criteria_id uuid references public.tenant_selection_criteria(id) on delete set null,
  di_run_id uuid references public.disparate_impact_runs(id) on delete set null,

  event text not null,                       -- 'criteria_published' | 'criteria_edited' | 'listing_scanned' | 'question_validated' | 'message_scanned' | 'finding_dismissed' | 'finding_acknowledged' | 'finding_fixed' | 'di_run_started' | 'di_run_completed' | 'rule_pack_updated'
  event_data jsonb,

  actor_user_id uuid,
  actor_kind text not null,                  -- 'landlord' | 'system' | 'cron'

  created_at timestamptz not null default now()
);

create index compliance_audit_log_owner_idx on public.compliance_audit_log (owner_id);
create index compliance_audit_log_finding_idx on public.compliance_audit_log (finding_id);
create index compliance_audit_log_created_idx on public.compliance_audit_log (created_at desc);

alter table public.compliance_audit_log enable row level security;

create policy "owners select" on public.compliance_audit_log
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.compliance_audit_log
  for insert with check (owner_id = auth.uid());
-- No update or delete. Append-only.

-- ------------------------------------------------------------
-- Storage bucket — for criteria PDFs
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

-- Storage RLS policies follow the existing property-photos pattern.
```

A second seed migration follows: `2026_05_XX_compliance_seed.sql` populates the `state_fair_housing_rules` table with the federal baseline (`US`) and the five MVP states (`CA`, `NY`, `TX`, `FL`, `WA`). Source URLs and `last_verified_on` dates are required for every row.

---

## 2. Backend modules

### 2.1 Schemas

**File:** `app/lib/schemas/compliance.ts` (new)

Mirror the migration. Provide:

- `FH_FINDING_SOURCE_VALUES` / type / `_LABELS`
- `FH_FINDING_SEVERITY_VALUES` / type / `_LABELS`
- `FH_FINDING_STATUS_VALUES` / type / `_LABELS`
- `FH_PROTECTED_CLASS_VALUES` / type / `_LABELS` — labels are the **landlord-facing** name (e.g. `familial_status: 'Family / children (familial status)'`)
- `FH_DI_STATUS_VALUES` / type / `_LABELS`
- Zod schemas: `StateFairHousingRuleSchema`, `TenantSelectionCriteriaSchema`, `CriteriaVersionSchema`, `ComplianceFindingSchema`, `DisparateImpactRunSchema`, `ComplianceAuditLogEntrySchema`
- Form-input schemas for the criteria wizard, the listing-scan input, and the question-audit input

### 2.2 Read queries

**File:** `app/lib/queries/compliance.ts` (new)

```typescript
export async function getStateFairHousingRules(jurisdiction: string): Promise<StateFairHousingRule | null>
export async function listStateFairHousingRules(): Promise<StateFairHousingRule[]>

export async function listCriteria(): Promise<TenantSelectionCriteria[]>
export async function getCriteria(id: string): Promise<TenantSelectionCriteriaWithVersions | null>
export async function getPublishedCriteriaForListing(listingId: string): Promise<TenantSelectionCriteria | null>
export async function listCriteriaVersions(criteriaId: string): Promise<CriteriaVersion[]>

export async function listFindings(opts?: {
  status?: FhFindingStatus
  source?: FhFindingSource
  severity?: FhFindingSeverity
  subjectListingId?: string
  subjectCriteriaId?: string
  limit?: number
}): Promise<ComplianceFinding[]>
export async function getFinding(id: string): Promise<ComplianceFinding | null>
export async function countOpenFindings(): Promise<number>
export async function countOpenFindingsBySeverity(): Promise<Record<FhFindingSeverity, number>>

export async function getLatestDisparateImpactRun(): Promise<DisparateImpactRun | null>
export async function listDisparateImpactRuns(opts?: { limit?: number }): Promise<DisparateImpactRun[]>

export async function getComplianceAuditLog(opts?: {
  findingId?: string
  criteriaId?: string
  diRunId?: string
  limit?: number
}): Promise<ComplianceAuditLogEntry[]>
```

### 2.3 Server actions

**File:** `app/actions/compliance.ts` (new, `'use server'`)

```typescript
// Criteria authoring
export async function createCriteria(input: CreateCriteriaInput): Promise<{ criteriaId: string }>
export async function updateCriteria(input: UpdateCriteriaInput): Promise<void>     // also writes a new criteria_versions row
export async function publishCriteria(input: { criteriaId: string }): Promise<void>
export async function deleteCriteria(input: { criteriaId: string }): Promise<void>  // soft-delete
export async function regenerateCriteriaPdf(input: { criteriaId: string }): Promise<{ pdfStoragePath: string }>

// Scanners (synchronous — they're fast)
export async function scanListingCopy(input: { listingId?: string; copy: string }): Promise<{ findings: ComplianceFinding[] }>
export async function validateScreeningQuestion(input: { questionId?: string; questionText: string; jurisdiction: string }): Promise<{ findings: ComplianceFinding[] }>

// Findings inbox actions
export async function acknowledgeFinding(input: { findingId: string }): Promise<void>
export async function dismissFinding(input: { findingId: string; reason: string }): Promise<void>
export async function markFindingFixed(input: { findingId: string }): Promise<void>

// Disparate-impact (also runs nightly via cron — see 2.6)
export async function runDisparateImpactNow(): Promise<{ runId: string }>
```

### 2.4 Rule packs

**Directory:** `app/lib/compliance/rules/` (new)

The rule pack is **pure data + pure functions** — no IO, no Supabase calls, no LLM. Easy to unit-test, easy to extend.

| File | What it provides |
|---|---|
| `_federal.ts` | The US federal baseline: 7 protected classes, occupancy "two-per-bedroom" guideline, FHA-required disclosures. Always loaded. |
| `_types.ts` | `Rule`, `RulePack`, `RuleMatch` types. |
| `ca.ts` | California: SOI protection, source of income includes Section 8, application fee = actual cost only, criminal-history lookback restricted by AB 1418, etc. |
| `ny.ts` | New York: SOI protection, $20 application fee cap, source-of-income protection (HSTPA 2019), arrest record protection. |
| `tx.ts` | Texas: federal baseline only — minimal state add-ons. Useful as a "less-restricted" comparison. |
| `fl.ts` | Florida: federal baseline + state-level gender-identity case law nuance. |
| `wa.ts` | Washington: SOI protection, fair-chance housing (Seattle especially restrictive — flag as city-level note). |
| `index.ts` | `loadRulePack(jurisdiction: string): RulePack` — federal baseline merged with state add-ons. Throws if jurisdiction is not in the supported list. |

Each rule has a stable `id` (e.g. `'fed.steering_familial'`, `'ca.soi_required'`) so `compliance_findings.rule_id` is queryable across versions. Rules carry their own `severity`, `title`, `detail`, `suggested_fix`, and a `match` function that takes the relevant input (listing copy, question text, criteria record).

### 2.5 Engines

**Directory:** `app/lib/compliance/` (new)

| File | What it does |
|---|---|
| `criteria-generator.ts` | Takes a `TenantSelectionCriteria` record + jurisdiction, runs every applicable rule, produces (a) `is_compliant` + findings, (b) the PDF document via `pdf/criteria-renderer.ts`. |
| `listing-scanner.ts` | Wraps the existing `scanOutboundMessage` from `fair-housing-guardrails.ts` and adds **listing-specific** rules from the rule pack (the existing scanner is tuned for direct-message replies; listings have different patterns like "great for families", "perfect for X", "minutes to St. Mary's Church"). Returns findings. |
| `question-validator.ts` | Validates a screening question against the rule pack. Reuses the protected-class regex set from `fair-housing-guardrails.ts::INPUT_RULES` plus question-specific patterns ("how many", "are you", "do you have a"). Returns findings. |
| `message-scanner.ts` | Persistence wrapper. The existing `scanInboundMessage` / `scanOutboundMessage` already run inline and persist flags onto `leasing_messages.guardrail_flags`. This file ALSO writes `compliance_findings` rows so the unified inbox shows them. Idempotent — re-scanning the same message replaces prior findings for that message_id. |
| `disparate-impact.ts` | Cohort analysis. Inputs: prospect decisions over `window_start..window_end` from the existing `prospects` table + `screening_audit_log`. Computes approval-rate by income band, credit band, eviction-history yes/no, application order. Flags any cohort whose approval rate diverges from the cross-cohort baseline by >20 points (configurable). Bias-neutral — never queries name, address, or any proxy. |
| `pdf/criteria-renderer.ts` | Renders the criteria record + jurisdiction footer + fair-housing disclosure into a PDF. Use `pdf-lib` (already in node_modules per Proof Check spec). v1 is a clean text layout; design polish is v2. |
| `signal-builders.ts` | Pure functions — `buildFinding(rule, evidence)` centralizes the title / detail / suggested-fix copy so the same rule produces identical output everywhere it's evaluated. |

### 2.6 Cron — nightly disparate-impact run

**File:** `app/api/cron/disparate-impact/route.ts` (new)

A Vercel Cron route hit nightly at 03:00 UTC. Iterates active landlords (≥10 prospect decisions in the last 90 days), creates a `disparate_impact_runs` row per landlord, runs the engine, persists findings.

Vercel Cron config goes in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/disparate-impact", "schedule": "0 3 * * *" }]
}
```

Authenticated via `CRON_SECRET` env var (matches existing late-fee cron pattern from Sprint 14).

### 2.7 PDF storage helper

**File:** `app/lib/storage/compliance-documents.ts` (new — separate bucket from photos and application-documents)

```typescript
export async function uploadComplianceDocument(opts: {
  ownerId: string
  criteriaId: string
  versionId: string
  pdfBytes: Uint8Array
}): Promise<{ storagePath: string }>

export async function getSignedUrlForComplianceDocument(opts: {
  storagePath: string
  expiresInSeconds?: number
}): Promise<string>
```

Path scheme: `{ownerId}/criteria/{criteriaId}/v{version}.pdf`.

---

## 3. UI

### 3.1 Compliance overview — `/dashboard/compliance`

**Replace** the Sprint-0 stub. New page contains:

- **Hero card:** "Active criteria document" — name + jurisdiction + green/amber/red compliance badge + "View" button. If none exists: "Create your tenant selection criteria — required for fair-housing safe-harbor protection" CTA.
- **Findings tile:** total open findings count, broken down by severity. Click → findings inbox.
- **Disparate impact tile:** "Last run: {timestamp}" + "{N} cohort patterns flagged" + "View dashboard" link.
- **Quick actions:** "Scan a listing", "Audit a question", "Run disparate impact now" buttons.
- **Compliance audit log preview:** last 5 events with "View all" link.

### 3.2 Criteria library — `/dashboard/compliance/criteria`

- Table: name, jurisdiction, status (draft / published), compliance badge, last edited, attached-listings count
- "Create new" button → wizard at `/dashboard/compliance/criteria/new`

### 3.3 Criteria wizard — `/dashboard/compliance/criteria/new` and `/[id]`

Multi-step form using the existing `useActionState` pattern:

1. **Basics:** Name, jurisdiction (dropdown of supported states; locked once saved).
2. **Income & credit:** Income multiple (default 3.0), min credit score, accepts vouchers (auto-locked to true in SOI-protected jurisdictions, with explanatory tooltip).
3. **History:** Eviction lookback / max count, criminal history lookback / categories — with inline rule-pack warnings (e.g. CA: "Criminal-history lookback over 7 years is restricted under AB 1418").
4. **Pets & occupancy:** Pet policy (with mandatory ESA/service-animal exemption text), occupancy max per bedroom (default 2, HUD baseline).
5. **Custom requirements:** Free-text — scanned on save against the listing-scanner rule set, findings shown inline.
6. **Review:** Summary of every field, list of any open findings, "Publish" button (disabled if any red findings exist; warns on amber but allows).

After publish, the criteria PDF is regenerated and a `criteria_versions` row is written.

### 3.4 Listing scanner — `/dashboard/compliance/listings`

Two modes:
- **Saved listing:** dropdown of existing `listings` rows → scan button → findings table.
- **Paste copy:** textarea → scan button → findings table.

Findings display: severity badge, title, the **exact triggering phrase** highlighted in the source text (using a simple `<mark>` wrapper), suggested rewrite, "Apply suggestion" / "Acknowledge" / "Dismiss" buttons.

If scanning a saved listing, an "Apply suggestion" click writes the rewrite back to the listing row (with confirmation modal — this edits live content).

### 3.5 Findings inbox — `/dashboard/compliance/findings`

Unified view across all sources:
- Filters: source, severity, status, jurisdiction, date range
- Group-by-source toggle
- Each row expands: full detail, evidence, suggested fix, action buttons (acknowledge / mark fixed / dismiss with required reason)
- Bulk action: "Acknowledge selected"
- CSV export

### 3.6 Disparate-impact dashboard — `/dashboard/compliance/disparate-impact`

- Header: last run timestamp, "Run now" button (admin only)
- Latest run card: cohort breakdown table (income band → approval rate, with the cross-cohort average for comparison)
- Pattern findings list: each red/amber finding with the cohort it concerns, the divergence magnitude, and a "What this means" plain-English explainer
- Historical runs table: last 30 runs, click to drill in

### 3.7 Compliance audit log — `/dashboard/compliance/audit`

UNION query over `compliance_audit_log` and `screening_audit_log` (per founder decision in Proof Check spec §8.4 — they share a page). Filterable, paginated 50/page, CSV export.

### 3.8 Listing detail page — extension

In `app/dashboard/listings/[id]/page.tsx`:
- New "Fair-housing scan" panel showing latest scan status (badge + finding count + "View findings" link)
- New "Tenant selection criteria" panel: shows the attached criteria doc; "Change" / "Detach" buttons; if `auto_attach_to_new_listings = true` and no criteria attached, shows "Auto-attaching the published criteria when this listing publishes"

### 3.9 Application question editor — extension

Wherever custom application questions are authored (extend the existing application builder under `app/dashboard/listings/[id]/...`):
- On save, every question runs through `validateScreeningQuestion`
- Findings appear inline below the question with severity badge + suggested rewrite
- Save is allowed for amber findings (with confirmation), blocked for none — even red findings can be saved (per hard rule #2), but the save button shows "Save anyway — this question may create legal exposure"

### 3.10 Leasing assistant — extension

In `app/dashboard/leasing-assistant/[id]/page.tsx`:
- The existing inline guardrail flags now also persist as `compliance_findings` rows
- New "View in compliance findings" link below each draft when output_flags are present

### 3.11 Public application — extension

In `app/apply/[slug]/page.tsx`:
- If the listing has an attached published criteria doc, render a "View tenant selection criteria" link at the top of the form (opens the PDF in a new tab via signed URL)
- Required disclosures from `state_fair_housing_rules.required_application_disclosures` render as a footer on the form

### 3.12 Sidebar update

In `app/dashboard/layout.tsx`, promote Compliance:

```
Operations
  ├── Compliance
  │   ├── Overview
  │   ├── Tenant selection criteria
  │   ├── Listing scans
  │   ├── Findings
  │   ├── Disparate impact
  │   └── Audit log
```

---

## 4. Build sequence

Each numbered step lands as one commit. Run `npm run lint && npx tsc --noEmit && npm test` between steps. Do not start the next step on a red build.

1. **chore: prerequisite — Proof Check shipped**
   FairScreen sits on top of Proof Check (shares the audit-log convention and the `prospects.stage = 'screening'` decision data feeding disparate impact). If Proof Check is not yet on `main`, ship it first.

2. **feat(compliance): db migration + storage bucket**
   Apply `2026_05_XX_compliance.sql`. Create the `compliance-documents` bucket. Add storage RLS policies matching the property-photos pattern. Verify in Supabase.

3. **feat(compliance): seed migration with federal baseline + 5 states**
   Apply `2026_05_XX_compliance_seed.sql` with `US`, `CA`, `NY`, `TX`, `FL`, `WA` rows. Every row must have `source_url`, `last_verified_on`, and `verified_by` set.

4. **feat(compliance): schemas + queries**
   `app/lib/schemas/compliance.ts`, `app/lib/queries/compliance.ts`. Add types to shared exports. Should compile clean. No UI yet.

5. **feat(compliance): rule packs (federal + 5 states)**
   `app/lib/compliance/rules/` directory. Include unit tests for `loadRulePack` and for at least 3 representative rules per jurisdiction.

6. **feat(compliance): criteria generator engine + PDF output**
   `criteria-generator.ts` + `pdf/criteria-renderer.ts`. Unit tests with synthetic criteria records covering at minimum: SOI-protected jurisdiction forces `accepts_section_8 = true`, criminal-history lookback over jurisdiction max raises a finding, occupancy >2 per bedroom raises an info-level note.

7. **feat(compliance): criteria wizard UI**
   `/dashboard/compliance/criteria` library + `/criteria/new` + `/criteria/[id]`. Wire to actions. PDF download button.

8. **feat(compliance): listing scanner engine + UI**
   `listing-scanner.ts` + `/dashboard/compliance/listings`. Extend `app/dashboard/listings/[id]/page.tsx` with the scan panel. Synthetic test fixtures committed under `test/compliance/listing-fixtures/`.

9. **feat(compliance): question validator engine + integration into application editor**
   `question-validator.ts` + extension of the existing custom-question editor. Inline findings UI.

10. **feat(compliance): communication scanner persistence + leasing-assistant integration**
    `message-scanner.ts`. Extend the existing `scanOutboundMessage` call sites in `assistant-service.ts` to also call `persistFindingsForMessage`. Verify `leasing_messages.guardrail_flags` continues to populate (compatibility) AND new `compliance_findings` rows appear.

11. **feat(compliance): disparate-impact engine + nightly cron**
    `disparate-impact.ts` + `app/api/cron/disparate-impact/route.ts` + `vercel.json` cron entry. Manual-trigger button on the DI dashboard for testing. Unit tests with synthetic decision sets covering: clean cohort = zero findings; one rejected cohort 25pt below baseline = one red finding.

12. **feat(compliance): findings inbox + audit page + overview hub**
    `/dashboard/compliance/findings`, `/dashboard/compliance/audit`, replace the Sprint-0 stub at `/dashboard/compliance` with the new overview. Sidebar updates.

13. **chore(compliance): documentation**
    Add `docs/SPRINT-FAIRSCREEN-NEEDS.md` (mirrors SPRINT-13-NEEDS.md format) listing every stub, every blocked partner integration, and what activates each.

---

## 5. Acceptance criteria

A feature is not done until each of these passes manually.

**Phase 2 (db):**
- [ ] All five tables exist in Supabase with RLS enabled and four policies each (except append-only tables).
- [ ] `compliance-documents` bucket exists.

**Phase 3 (seed):**
- [ ] `select * from state_fair_housing_rules` returns 6 rows.
- [ ] CA row: `protects_source_of_income = true`, `application_fee_notes` non-null, `last_verified_on` within the last 90 days.

**Phase 5 (rule packs):**
- [ ] `loadRulePack('CA')` returns federal classes + CA add-ons including SOI.
- [ ] `loadRulePack('XX')` throws.
- [ ] Unit tests pass for at least 15 representative rules across the 6 jurisdictions.

**Phase 6 (criteria generator):**
- [ ] Save criteria with `accepts_section_8 = false` and `jurisdiction = 'CA'`. Engine flips it to `true` AND records a `criteria_compliance_check` finding with rule_id `'ca.soi_required'`.
- [ ] Save criteria with criminal-history lookback of 10 years and jurisdiction `'CA'`. Engine raises an amber finding referencing AB 1418.
- [ ] PDF renders successfully and contains the fair-housing footer text.

**Phase 7 (criteria UI):**
- [ ] Walk through the wizard end-to-end, save, publish, download the PDF.
- [ ] Edit and re-publish — verify a new `criteria_versions` row appears and the PDF storage_path changes.

**Phase 8 (listing scan):**
- [ ] Paste copy containing "perfect for young professionals". Scanner returns a red finding at `references_protected_class` with a suggested rewrite.
- [ ] Click "Apply suggestion" on a saved listing. Listing copy updates. Re-scan returns no findings.

**Phase 9 (question audit):**
- [ ] Add a custom question "How many kids do you have?". Editor shows a red finding implicating familial status with suggested rewrite "How many people will live in the unit?".
- [ ] Add "What is your annual income?". No findings (income is permitted).
- [ ] **Critical hard-rule test:** Save the kids question anyway. Save succeeds. Audit log records `question_validated` with severity=red and a `question_saved_with_open_finding` event.

**Phase 10 (message scanner):**
- [ ] Send an outbound draft containing "we don't accept Section 8". Existing leasing-message flag still fires AND a new `compliance_findings` row appears with `source = 'outbound_message_scan'`.

**Phase 11 (disparate impact):**
- [ ] Hit the cron route manually with the `CRON_SECRET` header. A `disparate_impact_runs` row appears with `status = 'complete'`.
- [ ] With synthetic data showing 5/5 approvals in the high-income cohort and 1/5 in the low-income cohort (25pt divergence), verify a red finding is created.
- [ ] **Critical bias-neutrality test:** Inspect the engine's SQL — confirm it never selects `prospects.full_name`, `prospects.email`, `prospects.phone`, or any address field.

**Phase 12 (findings inbox):**
- [ ] Inbox shows findings from all 5 sources with correct filtering.
- [ ] Dismiss a finding with reason "Reviewed with attorney 2026-05-XX". Audit log records `finding_dismissed` with the reason. Dismissed finding hidden from the default view, surfaced under the "dismissed" filter.
- [ ] CSV export contains every finding row.

---

## 6. What's stubbed (matching SPRINT-13-NEEDS format)

### 6.1 State coverage beyond MVP 5

**What's stubbed**
- `loadRulePack('IL')` (and 44 other states) throws "jurisdiction not yet supported". The criteria wizard's jurisdiction dropdown only offers the supported list.

**What's needed before activation**
- Per-state research (≈4 hours of attorney-or-paralegal time per state to draft the rule pack + cite sources).
- A rule-pack TS file per state in `app/lib/compliance/rules/`.
- A new seed row in `state_fair_housing_rules`.

Roll out states in order of landlord demand. Track demand via a "Request your state" form that writes to `inbox/state_requests`.

### 6.2 City-level rules

**What's stubbed**
- The schema has `jurisdiction` text only. No city-level breakdown. NYC, SF, Seattle, Chicago all have additional rules that would require a separate `city_fair_housing_rules` table joined on `(state, city)`.

**What's needed**
- Schema extension for city-level rules.
- City detection on the criteria record (`criteria.city` field + dropdown limited to cities with rule packs).
- Per-city rule files under `app/lib/compliance/rules/cities/`.

### 6.3 Attorney-reviewed PDF templates

**What's stubbed**
- The criteria PDF is generated from a basic `pdf-lib` layout with the fair-housing footer hardcoded in `pdf/criteria-renderer.ts`. The footer text is plain-English compliant but has not been reviewed by a fair-housing attorney.

**What's needed**
- One-time engagement with a fair-housing attorney to review the footer language, the disclosures, and the criteria document layout.
- Per-state footer variants if the attorney recommends them.
- Updated `verified_by` field on `state_fair_housing_rules` to "Attorney name, ESQ" instead of "Rentbase Research".

### 6.4 Multi-language support

**What's stubbed**
- All scanners are English-only. Spanish-language inbound messages, listings, or applications get zero findings — false negatives.

**What's needed**
- Spanish rule pack additions (regex variants for protected-class disclosures and discriminatory phrasing).
- Translated criteria PDF templates.
- Translated UI strings (i18n is out of scope for v1).

Defer until a landlord requests it.

### 6.5 Listing image scanning

**What's stubbed**
- Listing scanner reads the text copy only. Listing photos can also create exposure (e.g. a photo of the unit's previous tenants implies who "should" live there). Photos are not scanned.

**What's needed**
- Anthropic Claude vision integration to caption listing images and run the captions through the listing scanner.
- Cost decision: per-listing-photo scan at upload time vs on-demand.

### 6.6 Cross-landlord pattern detection

**What's stubbed**
- Disparate-impact analysis is per-landlord only. Patterns visible across the customer base (e.g. "this exact criteria template, used by 200 landlords, correlates with high rejection rates in voucher cohorts") are not surfaced.

**What's needed**
- A separate platform-level analytics pipeline. Significant privacy and aggregation review required before building.

### 6.7 Lawsuit / complaint database integration

**What's stubbed**
- We do not pull HUD complaint records, state agency complaints, or filed lawsuits. A landlord's existing complaint history would meaningfully change risk scoring.

**What's needed**
- Partner integration with a public-records vendor (or scraping of HUD's iCERS — legally fraught).
- Disclosure language explaining that complaint history is being checked.

---

## 7. Out of scope (deferred — do not build in this sprint)

- **AI-generated criteria.** Criteria are template + landlord input + rule pack only. No LLM in the criteria generator.
- **Auto-fix without confirmation.** Listing rewrites require an explicit "Apply suggestion" click. We never silently mutate live listing copy.
- **Tenant-facing transparency reports.** Applicants do not see the disparate-impact analysis. The criteria PDF is the only artifact they see.
- **Automated complaint filing.** We do not file HUD complaints on behalf of anyone.
- **Real-time scanning of every keystroke.** Scans are on-save / on-publish only.
- **A safe-harbor "compliance score" advertised to applicants.** Tempting but creates implied warranty exposure. Don't build.
- **Anything that LOWERS the safe-harbor bar.** Any feature whose effect would be to allow discrimination must be rejected and escalated.

---

## 8. Open questions for founder before Phase 1

**Status:** ✅ Answered by founder on 2026-04-26. Phase 2 is unblocked.

1. **Initial state coverage.** ✅ `US, CA, NY, TX, FL, WA`. Covers ~50% of US rental units; TX gives a "low-add-ons" baseline. Swap-out is allowed at Phase 3 if a specific state with active prospects emerges, but ship the 5-state set as-is for v1.

2. **PDF generation library.** ✅ `pdf-lib`. Already a dep from Proof Check. Puppeteer deferred to v2 if visual fidelity becomes a sale-blocker.

3. **Disparate-impact cohort threshold.** ✅ Minimum 10 decisions over rolling 90 days. Codify in `app/lib/compliance/disparate-impact.ts` as `MIN_COHORT_DECISIONS = 10`.

4. **Findings retention policy.** ✅ **7 years** (not 3). Aligns with the long tail of FHA civil + class-action exposure. **Side effect:** also bump `screening_audit_log` retention from 3 → 7 years to match. This is a one-line update to Proof Check's stub-mode docs and a single comment change in the audit log policy. No schema change needed (retention is a documented policy, not a hard delete trigger).

5. **Sidebar placement.** ✅ Top-level Compliance with 5 sub-items per §3.12. Discoverability over compactness.

6. **Attorney engagement.** ✅ **Yes, staged.** Build through Phase 7 (criteria PDF rendering) without attorney review. After Phase 7 ships, engage a fair-housing attorney with the rendered PDF + the rule pack files for a $2–5k one-time review. Internal use (Maccabi-owned properties) is permitted before that review. **Public marketing of this module is blocked until the attorney sign-off lands.** Track this as a release gate, not a build gate.

---

## 9. References

- Source idea: Ideabrowser idea `#3776` ("Screening platform that automates fair housing checks for landlords")
- Companion module: `rentapp/docs/PROOF-CHECK-SPEC.md` (the forensics-side counterpart)
- Existing fair-housing pattern: `app/lib/leasing/fair-housing-guardrails.ts`, `CLAUDE.md` hard rule #4
- Migration convention: `db/migrations/2026_04_15_state_rent_rules.sql` (precedent for state-by-state reference data + `last_verified_on` staleness pattern)
- Audit log convention: `app/dashboard/leasing-assistant/audit/page.tsx`, screening_audit_log table
- Compliance disclaimer UI: `app/ui/compliance-disclaimer.tsx`
- Storage convention: `app/lib/storage/photos.ts`
- Sprint spec convention: `docs/SPRINT-13-NEEDS.md`, `docs/PROOF-CHECK-SPEC.md`
- Cron precedent: late-fee charges cron from Sprint 14 (`db/migrations/2026_04_26_late_fee_charges.sql`)
