# Proof Check — Forensic Tenant Screening

**Module name in code:** `screening`
**Sprint:** TBD (insert after Sprint 14 inspections / leasing assistant work is committed)
**Source:** Ideabrowser project `2dea0440-13bf-4e3c-8989-42e4b41db0a9` ("Forensic tenant screening for landlords who can't afford to guess"). Scored 9/9/9 on opportunity / pain / builder confidence. Execution difficulty 3/10.

---

## TL;DR

Proof Check is the **screening stage** of the prospects pipeline made real. When an applicant uploads pay stubs, bank statements, an employment letter, and a photo ID, Proof Check runs deterministic forensics on the documents and surfaces "review signals" before the landlord clicks Approve. It never decides — it explains.

The wedge is forensics, not credit pulls. SmartMove and TurboTenant give you a credit score; Proof Check tells you the pay stub was edited in Photoshop yesterday and the employer's phone number appears on a burner-phone reseller.

This module mounts under the existing `prospects` flow at `/dashboard/prospects/[id]/screening`. Every signal it raises follows the **fair-housing safe-harbor pattern** already established in `app/lib/leasing/fair-housing-guardrails.ts` and codified in CLAUDE.md hard rule #4: deterministic engine raises signals on legally-allowed inputs only, AI summarizes in plain English, human makes the decision, every run is logged for FCRA 3-year retention.

---

## Hard rules — non-negotiable

These are CLAUDE.md rule #4 applied to this module. Any implementation that violates them must be reverted, not merged.

1. **Deterministic engine raises signals. AI never raises signals.** AI is allowed to *summarize* and *explain* the deterministic findings in plain English, and to *suggest verification steps*. AI must never be the source of a red/amber/green rating.
2. **Never auto-reject.** Every signal — even three reds — leaves the Approve and Reject buttons enabled. The landlord makes the call.
3. **Forbidden signals never enter the engine.** No name-based ethnicity inference. No address-based redlining. No source-of-income filtering. No correlate-of-protected-class proxies.
4. **Allowed signals only.** Income consistency, document authenticity, employment verification, eviction history (when partner is wired), identity verification (when partner is wired), reference cross-check.
5. **Every run is logged.** One row per Proof Check run in `screening_audit_log`, retained 3+ years, surfaced in the existing `fair_housing_audit` page with CSV export.
6. **Always disclosed.** Every screening report PDF and every on-screen summary carries a fair-housing compliance footer matching the language already used on the leasing-assistant audit log.

If a future feature request would violate any of the above, escalate to the founder before building.

---

## Where it slots into the existing app

| Touch point | What changes |
|---|---|
| `app/dashboard/prospects/[id]/page.tsx` | New "Screening" panel showing latest report status + link to full screening tab |
| `app/dashboard/prospects/[id]/screening/page.tsx` | **NEW** — full screening UI (upload, run, view signals, view AI summary, approve/reject prospects) |
| `app/apply/[slug]/page.tsx` | New optional document upload step (pay stubs, bank statements, employer letter, ID). Application still submits without documents — they're additive |
| `app/actions/public-application.ts` | Accept document uploads alongside form fields, persist to `application_documents` |
| `app/dashboard/leasing-assistant/audit/page.tsx` | Extend to include Proof Check audit entries (or add a sibling `/dashboard/screening/audit` — choice deferred to implementer) |
| Sidebar (`app/dashboard/layout.tsx`) | No new top-level entry. Screening is reached from a prospect, not from the sidebar |

---

## 1. Database

One new migration: `db/migrations/2026_04_26_screening.sql`.

Three tables: `application_documents`, `screening_reports`, `screening_signals`.
Plus extending the existing `prospects.stage` enum is **not** required — `'screening'` already exists.

```sql
-- ============================================================
-- Proof Check — Forensic Tenant Screening
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Three tables:
--   application_documents — files uploaded with an application
--                           (pay stubs, bank statements, employer
--                           letter, ID). One row per file.
--   screening_reports     — one row per Proof Check run on a
--                           prospect. Stores summary, AI narrative,
--                           overall risk band.
--   screening_signals     — individual signals raised by the
--                           deterministic engine. One row per
--                           signal per report.
--
-- Documents follow the same storage convention as photos
-- (app/lib/storage/photos.ts) — paths in a text column, file
-- bytes in Supabase Storage bucket 'application-documents'.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type application_document_kind as enum (
  'pay_stub',
  'bank_statement',
  'employment_letter',
  'photo_id',
  'tax_return',          -- self-employed applicants
  'reference_letter',
  'other'
);

create type screening_report_status as enum (
  'pending',             -- queued, no signals computed yet
  'running',             -- engine is processing
  'complete',            -- all checks done
  'partial',             -- some checks failed (e.g. paid API down) — review with what we have
  'error'                -- unrecoverable failure
);

-- Risk band is the report-level summary. Computed deterministically
-- from the count + severity of signals. Never set by AI.
create type screening_risk_band as enum (
  'green',               -- 0 amber/red signals
  'amber',               -- ≥1 amber, 0 red
  'red'                  -- ≥1 red
);

create type screening_signal_severity as enum (
  'green',               -- positive confirmation (matched, verified)
  'amber',               -- inconsistent or unverifiable, review needed
  'red'                  -- strong evidence of fraud or misrepresentation
);

-- The kinds of signals the engine can raise. Adding a new check
-- means adding a new value here AND extending the engine.
create type screening_signal_kind as enum (
  'pdf_metadata_anomaly',
  'pdf_font_inconsistency',
  'pdf_image_overlay_detected',
  'income_math_inconsistent',
  'pay_frequency_mismatch',
  'bank_deposits_below_stated_income',
  'employer_phone_burner_or_voip',
  'employer_phone_reused_across_applicants',
  'employer_email_domain_invalid',
  'employer_email_domain_freshly_registered',
  'eviction_record_match',           -- partner-wired
  'eviction_record_alias_match',     -- partner-wired
  'identity_verification_failed',    -- partner-wired
  'address_history_inconsistent',
  'reference_phone_unreachable'
);

-- ------------------------------------------------------------
-- application_documents
-- ------------------------------------------------------------

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- A document can be attached to a prospect that exists in our
  -- system OR to a public-application submission BEFORE the
  -- prospect record is created. We resolve the link at submission
  -- time. So prospect_id is nullable.
  prospect_id uuid references public.prospects(id) on delete cascade,
  public_application_token uuid,    -- temporary join key for pre-submission uploads

  kind application_document_kind not null,
  storage_path text not null,        -- relative path in 'application-documents' bucket
  original_filename text not null,
  byte_size integer not null,
  mime_type text not null,

  -- Captured at upload, used by the engine. These are read-only
  -- once written.
  uploaded_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index application_documents_owner_idx
  on public.application_documents (owner_id) where deleted_at is null;
create index application_documents_prospect_idx
  on public.application_documents (prospect_id) where deleted_at is null;
create index application_documents_token_idx
  on public.application_documents (public_application_token)
  where deleted_at is null and public_application_token is not null;

alter table public.application_documents enable row level security;

create policy "owners select" on public.application_documents
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.application_documents
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.application_documents
  for update using (owner_id = auth.uid());
create policy "owners delete" on public.application_documents
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_application_documents
  before update on public.application_documents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- screening_reports
-- ------------------------------------------------------------

create table public.screening_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,

  status screening_report_status not null default 'pending',
  risk_band screening_risk_band,                 -- null until status='complete' or 'partial'

  -- AI-generated plain-English summary. Labeled clearly in the
  -- UI as "AI summary — recommendation only, not a decision."
  ai_summary text,
  ai_summary_model text,                         -- e.g. 'claude-opus-4-7' for audit
  ai_summary_generated_at timestamptz,

  -- Deferred partner integrations populate these when wired.
  eviction_check_provider text,                  -- e.g. 'checkr', 'rentprep'
  eviction_check_completed_at timestamptz,
  identity_check_provider text,                  -- e.g. 'persona', 'jumio'
  identity_check_completed_at timestamptz,

  -- Snapshot of the prospect's stated facts at run time. The
  -- prospect record can change later; the report shouldn't.
  stated_income_monthly numeric(10, 2),
  stated_employer text,
  stated_employer_phone text,
  stated_employer_email text,

  -- Final landlord decision recorded HERE for FCRA audit linkage.
  -- Decision is made from the prospect detail page; this column
  -- snapshots what was decided after this report was viewed.
  landlord_decision text,                        -- 'approved' | 'rejected' | 'requested_more_info' | null
  landlord_decision_at timestamptz,
  landlord_decision_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index screening_reports_owner_idx
  on public.screening_reports (owner_id) where deleted_at is null;
create index screening_reports_prospect_idx
  on public.screening_reports (prospect_id) where deleted_at is null;
create index screening_reports_status_idx
  on public.screening_reports (status) where deleted_at is null;

alter table public.screening_reports enable row level security;

create policy "owners select" on public.screening_reports
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.screening_reports
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.screening_reports
  for update using (owner_id = auth.uid());
create policy "owners delete" on public.screening_reports
  for delete using (owner_id = auth.uid());

create trigger set_updated_at_screening_reports
  before update on public.screening_reports
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- screening_signals
-- ------------------------------------------------------------

create table public.screening_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.screening_reports(id) on delete cascade,

  kind screening_signal_kind not null,
  severity screening_signal_severity not null,

  -- One-line plain-English title shown in the signal list.
  title text not null,

  -- Longer plain-English explanation shown when the signal is
  -- expanded. Includes the specific evidence (e.g. "PDF Producer
  -- field is 'Adobe Photoshop 25.0' — pay stubs from ADP normally
  -- show 'iText 5.5.13'").
  detail text not null,

  -- Suggested verification step the landlord can take before
  -- making a decision. Empty for green signals.
  suggested_action text,

  -- Which document(s) triggered this signal, if any.
  source_document_ids uuid[] default '{}',

  -- Raw evidence the engine extracted. Internal — for debugging
  -- and engine improvements. Not shown to landlord.
  evidence_json jsonb,

  created_at timestamptz not null default now()
);

create index screening_signals_owner_idx on public.screening_signals (owner_id);
create index screening_signals_report_idx on public.screening_signals (report_id);
create index screening_signals_severity_idx on public.screening_signals (severity);

alter table public.screening_signals enable row level security;

create policy "owners select" on public.screening_signals
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.screening_signals
  for insert with check (owner_id = auth.uid());
create policy "owners update" on public.screening_signals
  for update using (owner_id = auth.uid());
create policy "owners delete" on public.screening_signals
  for delete using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- screening_audit_log
-- ------------------------------------------------------------
-- One row per Proof Check action: report created, run started,
-- run completed, document viewed, decision recorded. Retained
-- forever (the trigger never deletes). Surfaced in the existing
-- fair_housing_audit page.

create table public.screening_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.screening_reports(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,

  event text not null,                -- 'report_created' | 'run_started' | 'run_completed' | 'document_uploaded' | 'document_viewed' | 'decision_recorded' | 'ai_summary_generated'
  event_data jsonb,                   -- event-specific payload

  actor_user_id uuid,                 -- which auth.users row triggered it (null for engine/cron)
  actor_kind text not null,           -- 'landlord' | 'tenant' | 'system' | 'partner_api'

  created_at timestamptz not null default now()
);

create index screening_audit_log_owner_idx on public.screening_audit_log (owner_id);
create index screening_audit_log_report_idx on public.screening_audit_log (report_id);
create index screening_audit_log_prospect_idx on public.screening_audit_log (prospect_id);
create index screening_audit_log_created_idx on public.screening_audit_log (created_at desc);

alter table public.screening_audit_log enable row level security;

create policy "owners select" on public.screening_audit_log
  for select using (owner_id = auth.uid());
create policy "owners insert" on public.screening_audit_log
  for insert with check (owner_id = auth.uid());
-- No update or delete policies. Audit log is append-only.

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------
-- Create the bucket via Supabase dashboard OR via SQL:

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

-- RLS on the bucket: only the owner can read/write paths under
-- their owner_id. Storage RLS policies are written separately
-- via Supabase storage policy editor — see existing pattern in
-- the property-photos bucket.
```

---

## 2. Backend modules

### 2.1 Schemas

**File:** `app/lib/schemas/screening.ts` (new)

Mirror the migration. Provide:

- `APPLICATION_DOCUMENT_KIND_VALUES`, type, `_LABELS` record
- `SCREENING_REPORT_STATUS_VALUES`, type, `_LABELS`
- `SCREENING_RISK_BAND_VALUES`, type, `_LABELS`
- `SCREENING_SIGNAL_SEVERITY_VALUES`, type, `_LABELS`
- `SCREENING_SIGNAL_KIND_VALUES`, type, `_LABELS` — labels are the **landlord-facing one-liner** for that signal kind, e.g. `pdf_font_inconsistency: 'Pay stub fonts don't match — possible edit'`
- Zod schemas: `ApplicationDocumentSchema`, `ScreeningReportSchema`, `ScreeningSignalSchema`, `ScreeningAuditLogSchema`
- Form input schemas for the public application doc upload and the dashboard re-upload

### 2.2 Read queries

**File:** `app/lib/queries/screening.ts` (new)

```typescript
// Public read API for the screening domain.
//
// All queries are RLS-scoped. The caller is always the landlord
// — tenants do not read screening reports. They only contribute
// uploads through the public-application action.

export async function getScreeningReport(reportId: string): Promise<ScreeningReportWithSignals | null>
export async function getLatestScreeningReportForProspect(prospectId: string): Promise<ScreeningReport | null>
export async function listScreeningReportsForProspect(prospectId: string): Promise<ScreeningReport[]>
export async function listScreeningSignals(reportId: string): Promise<ScreeningSignal[]>
export async function listApplicationDocuments(prospectId: string): Promise<ApplicationDocument[]>
export async function getScreeningAuditLog(opts?: { prospectId?: string; reportId?: string; limit?: number }): Promise<ScreeningAuditLogEntry[]>

// Counts for dashboard widgets:
export async function countProspectsAwaitingScreeningReview(): Promise<number>  // status=complete, risk_band IN ('amber','red'), no decision yet
```

### 2.3 Server actions

**File:** `app/actions/screening.ts` (new, `'use server'`)

```typescript
// Returns the new report id. Triggers the engine asynchronously.
// Fire-and-forget — UI polls or revalidates.
export async function createScreeningReport(input: { prospectId: string }): Promise<{ reportId: string }>

// Manual retry of a 'partial' or 'error' report.
export async function rerunScreeningReport(input: { reportId: string }): Promise<void>

// Landlord uploads a document on behalf of a prospect (e.g.
// applicant emailed it). Triggers a re-run of the latest report.
export async function uploadApplicationDocument(input: {
  prospectId: string
  kind: ApplicationDocumentKind
  file: File
}): Promise<{ documentId: string }>

// Landlord deletes a document (typo, wrong file, replaced).
// Soft-delete via deleted_at. Triggers a re-run.
export async function deleteApplicationDocument(input: { documentId: string }): Promise<void>

// Landlord records the final decision. Writes to the report AND
// appends an audit log entry. Mirrors decision back into prospect.stage.
export async function recordScreeningDecision(input: {
  reportId: string
  decision: 'approved' | 'rejected' | 'requested_more_info'
  notes?: string
}): Promise<void>
```

### 2.4 Forensics engine

**Directory:** `app/lib/screening/` (new)

The engine is **deterministic only**. Every check returns a typed signal with severity, title, detail, and suggested action. No LLM calls in this directory.

| File | What it does |
|---|---|
| `engine.ts` | Orchestrator. Loads a report's documents, runs every check that has the inputs it needs, persists signals, computes risk_band, marks status complete/partial. Idempotent — a re-run replaces prior signals for the same report. |
| `pdf-forensics.ts` | Reads PDF metadata (Producer, Creator, ModDate vs CreateDate). Detects font-family mixing within a single text run. Detects raster-image overlays on text regions. Returns 0+ signals per document. Use `pdf-lib` + `pdfjs-dist` (already in node_modules per package.json — verify before building). |
| `income-consistency.ts` | Compares stated income vs pay-stub gross vs bank-deposit totals. Detects pay-frequency mismatches (stated bi-weekly but stubs show monthly). Tolerance: 5% before raising amber, 15% for red. |
| `employer-verification.ts` | Reverse-lookup employer phone (free tier: NumLookupAPI or similar — pick at implementation; document choice in `SPRINT-PROOF-CHECK-NEEDS.md`). Detects burner / VOIP / disposable. Cross-checks email domain MX records and registration age (WHOIS) — domains <30 days old raise amber, <7 days raise red. Cross-checks phone numbers against this landlord's prior applications for reuse. |
| `text-extractors/` | Sub-folder. `pay-stub.ts`, `bank-statement.ts`, `employment-letter.ts`. Each extracts the structured fields the consistency checks need. Use heuristics — regex over OCR text plus PDF text-layer parse. Failures here downgrade the report to `partial` rather than `error`. |
| `signal-builders.ts` | Pure functions — given evidence, build a `ScreeningSignal` row. Centralizes the plain-English titles and details so they're not scattered. |
| `risk-band.ts` | Deterministic risk band computation. ≥1 red → red. ≥1 amber, 0 red → amber. Otherwise → green. No exceptions, no AI input. |

**Stub-mode default:** Until partner APIs are wired (eviction, identity), the corresponding signal kinds simply aren't produced. The report status becomes `partial` if any required-but-missing partner is configured to be required (controlled by env var `SCREENING_REQUIRE_EVICTION_CHECK`, default `false` in dev).

### 2.5 AI summary layer

**File:** `app/lib/screening/ai-summary.ts` (new)

This is the **only** AI-using file in the screening module. It calls Claude with:

- **System prompt** containing the same fair-housing rules from `fair-housing-guardrails.ts::SYSTEM_PROMPT` plus a screening-specific extension forbidding decision language and forbidding raising new signals.
- **User prompt** containing the deterministic signals as a structured list.
- **Output:** a plain-English narrative ≤4 paragraphs, ending with a numbered checklist of "verify these things before signing."

Stub mode: if `ANTHROPIC_API_KEY` is missing, return a templated summary built from the signal list. The UI never sees a missing summary. Mark the model field as `'stub'` so the audit log distinguishes.

The output is post-processed through the existing `runOutputGuardrails` helper from `fair-housing-guardrails.ts` — if the AI ever produces decision language ("denied", "do not approve"), the guardrail strips it and replaces with `[recommendation removed by guardrail]` and the audit log records the strip event.

### 2.6 Storage helper

**File:** `app/lib/storage/application-documents.ts` (new — separate from photos because the bucket and path schema differ)

```typescript
export async function uploadApplicationDocument(opts: {
  ownerId: string
  kind: ApplicationDocumentKind
  publicApplicationToken?: string  // for pre-prospect uploads
  prospectId?: string
  file: File
}): Promise<{ storagePath: string }>

export async function getSignedUrlForDocument(opts: {
  documentId: string
  expiresInSeconds?: number  // default 300
}): Promise<string>

export async function deleteStoredDocument(storagePath: string): Promise<void>
```

Path scheme: `{ownerId}/{prospectId or token}/{kind}/{uuid}.{ext}`. Mirrors the photos convention.

---

## 3. UI

### 3.1 Public application — `/apply/[slug]`

**Touch:** `app/apply/[slug]/page.tsx` and the existing application form component.

Add an optional **"Documents (recommended)"** step after the contact + employment fields. Drag-and-drop zone. Accepted file types: PDF, JPG, PNG. Max 10MB per file, max 8 files total. Each upload immediately writes to `application_documents` keyed by the `public_application_token` — the token is generated when the form is opened so uploads can happen before submission.

Plain-English help text: *"Upload a recent pay stub, your last bank statement, and a photo ID. These help us process your application faster. We'll never share these documents."*

When the form submits, the existing `submitPublicApplication` action picks up all documents matching the token and re-keys them to the new prospect_id.

### 3.2 Dashboard — prospect detail page

**Touch:** `app/dashboard/prospects/[id]/page.tsx`

Add a **Screening** card showing the latest report status:
- No report yet → "Run Proof Check" button (primary CTA). Disabled with tooltip if 0 documents are uploaded.
- Pending / running → spinner + "Analyzing — usually under a minute"
- Complete with risk band → colored badge (green / amber / red) + signal count + "View full report" link
- Partial → amber badge + "Some checks couldn't run" + "View" link

Card title: **"Application screening"**. Subtitle: **"Forensic checks on uploaded documents. Findings only — never a decision."**

### 3.3 Dashboard — screening tab

**New page:** `app/dashboard/prospects/[id]/screening/page.tsx`

Three sections, top to bottom:

**A. Documents**
- Table: kind, original filename, uploaded date, size, view (signed URL), delete
- "Upload document" button opens a modal with kind dropdown + file picker
- "Re-run Proof Check" button at the top of the section, disabled while a run is in flight

**B. AI summary**
- Card with `ai_summary` rendered as paragraphs
- Header chip: "AI summary — recommendation only, never a decision"
- Footer line: "Generated by {model} at {timestamp}"
- If `model = 'stub'`, additional chip: "Live AI not configured — using rule-based template"

**C. Signals**
- Grouped by severity (red first, then amber, then green)
- Each signal is an expandable row: badge + title in collapsed state; severity, detail, suggested action, source document chips when expanded
- Empty state: "Upload at least one document and click Run Proof Check"

Below the three sections, a **Decision** bar (sticky at bottom, like the inspection sign form):
- Buttons: **Approve**, **Request more info**, **Reject** (all three always enabled regardless of risk band — fair-housing rule)
- Optional notes textarea
- Disclosure footer: standard fair-housing language matching the leasing-assistant audit page

### 3.4 Dashboard — screening audit log

**New page:** `app/dashboard/screening/audit/page.tsx`

Mirror `app/dashboard/leasing-assistant/audit/page.tsx`:
- Filterable table (prospect, date range, event, actor)
- CSV export button
- Pagination at 50 rows

Add a sidebar entry under **Operations → Compliance → Screening audit** (or merge into existing Compliance page if simpler).

### 3.5 Dashboard widgets

Add a tile to the existing **Action Items** panel (`app/lib/queries/action-items.ts`):
- "Screening reviews waiting" — count from `countProspectsAwaitingScreeningReview()`. Click → filtered prospects list.

---

## 4. Build sequence

Each numbered step lands as one commit. Run `npm run lint && npx tsc --noEmit && npm test` between steps. Do not start the next step on a red build.

1. **chore: prerequisite — commit current uncommitted work**
   This sprint sits on top of `main`. The 97 uncommitted files from the Apr 22-24 sprint MUST be committed first per the recommended commit plan in `HANDOFF-2026-04-24.md`. If they're already committed when this sprint starts, skip this step.

2. **feat(screening): db migration + storage bucket**
   Apply `db/migrations/2026_04_26_screening.sql`. Create the storage bucket via SQL or dashboard. Add storage RLS policies matching property-photos pattern. Verify in Supabase: tables exist, policies enabled, bucket exists.

3. **feat(screening): schemas + queries**
   `app/lib/schemas/screening.ts`, `app/lib/queries/screening.ts`. Add types to any shared exports. No UI yet. Should compile clean.

4. **feat(screening): document uploads on public application**
   Storage helper. Update `/apply/[slug]` form to support uploads. Update `submitPublicApplication` to re-key by token. Manual test: open the form, upload a PDF, submit, verify the document row exists with the new prospect_id.

5. **feat(screening): forensics engine (deterministic only)**
   `app/lib/screening/` directory. PDF forensics, income consistency, employer verification (the free-API parts). Unit tests in `test/screening/` covering at minimum: edited-PDF detection, font-mismatch detection, income-math mismatch, burner-phone detection. Use synthetic test fixtures committed under `test/screening/fixtures/`.

6. **feat(screening): server actions + audit log**
   `app/actions/screening.ts`. Engine runs synchronously inside the action for v1 (background queue is overkill for a 1-2s job). Every action writes one or more rows to `screening_audit_log`.

7. **feat(screening): dashboard prospect screening UI**
   The new `/dashboard/prospects/[id]/screening` page + the card on the prospect detail page. Decision bar wires to `recordScreeningDecision`.

8. **feat(screening): AI summary layer (stub-mode)**
   `app/lib/screening/ai-summary.ts` with template-based stub. Wire into the engine so every report gets a summary. UI displays it. No `ANTHROPIC_API_KEY` required to ship.

9. **feat(screening): activate Anthropic for live AI summary**
   Swap the stub for a real call when `ANTHROPIC_API_KEY` is present. Output passes through `runOutputGuardrails`. Audit log records the model used. Falls back to stub on API error.

10. **feat(screening): audit log page + sidebar entry**
    `/dashboard/screening/audit` (or extension of compliance). CSV export. Sidebar wiring.

11. **feat(screening): dashboard action items integration**
    Add the "Screening reviews waiting" tile.

12. **chore(screening): documentation**
    Add `docs/SPRINT-PROOF-CHECK-NEEDS.md` (mirrors SPRINT-13-NEEDS.md format) listing every stub, every blocked partner integration, and what activates each.

---

## 5. Acceptance criteria

A feature is not done until each of these passes manually. Automated tests cover most but the human walkthrough is non-negotiable.

**Phase 4 (uploads):**
- [ ] Open `/apply/test-listing-slug` in incognito. Upload a 5MB PDF. Submit. Verify the prospect record exists with the document attached and visible in the dashboard.

**Phase 5 (engine):**
- [ ] Feed the engine a known-edited PDF (test fixture). Verify `pdf_metadata_anomaly` and/or `pdf_font_inconsistency` signals are raised at red severity.
- [ ] Feed a clean PDF. Verify no signals are raised (or only green signals).
- [ ] Feed a pay stub showing $5,000 gross and a stated income of $8,000. Verify `income_math_inconsistent` is raised at amber or red.

**Phase 7 (UI):**
- [ ] As a logged-in landlord, navigate to a prospect with documents. Click Run Proof Check. Watch the status flip to running, then complete. See risk band + signals.
- [ ] Click a red signal. See the title, detail, and suggested action.
- [ ] Click Approve. Verify the prospect stage updates and the audit log shows a `decision_recorded` entry.
- [ ] **Critical fair-housing test:** With 3 red signals showing, verify Approve and Reject are BOTH still enabled. Tooltips do not say "not recommended." This is the load-bearing rule.

**Phase 8/9 (AI):**
- [ ] With no `ANTHROPIC_API_KEY`, run a report. Verify the AI summary card shows template text and the "Live AI not configured" chip.
- [ ] With `ANTHROPIC_API_KEY` set, run a report. Verify a real AI summary appears, the model field is correct, and an `ai_summary_generated` audit log entry exists.
- [ ] **Critical guardrail test:** Manually craft a fake AI response containing the word "denied". Run it through `runOutputGuardrails`. Verify the word is stripped and a guardrail-strip event is logged.

**Phase 10 (audit):**
- [ ] Generate at least 3 reports. Open the audit page. Filter by date and prospect. Export CSV. Open in Excel. Verify all events are present and timestamps are correct.

---

## 6. What's stubbed (matching SPRINT-13-NEEDS format)

### 6.1 Eviction database lookup

**What's stubbed**
- `app/lib/screening/eviction-lookup.ts` — returns no signals, marks the report as `partial` if `SCREENING_REQUIRE_EVICTION_CHECK=true`.

**What's needed before activation**
- Pick a partner: Checkr, RentPrep, or TransUnion SmartMove (already on `HANDOFF-2026-04-24.md` blocked list).
- API credentials in `.env.local` (var name TBD by partner choice).
- Reseller agreement and FCRA-compliant data-use disclosures — partner-specific paperwork.
- Cost-per-check decision: pass through to landlord as a per-screening fee, or absorb into subscription tier.

### 6.2 Identity verification

**What's stubbed**
- `app/lib/screening/identity-verification.ts` — same pattern. No signals, downgrades to `partial` if env var requires it.

**What's needed**
- Pick a partner: Persona, Jumio, or Stripe Identity.
- API credentials.
- Update the public application UI to capture the live ID upload through the partner's hosted flow (avoids us touching the document directly — significant compliance reduction).

### 6.3 Reverse-phone provider

**What's stubbed**
- `app/lib/screening/employer-verification.ts::reversePhoneLookup()` — returns `{ carrier: 'unknown', is_voip: false, is_disposable: false }` if `REVERSE_PHONE_API_KEY` is not set. The signal is not raised in that case.

**What's needed**
- Pick a free or low-cost provider — NumLookupAPI, NumVerify, or Twilio Lookup. Twilio Lookup is the most defensible (already a dependency in the SMS adapter).
- API key in `.env.local`.

### 6.4 WHOIS / domain age provider

**What's stubbed**
- `app/lib/screening/employer-verification.ts::domainAgeDays()` — returns `null` if `WHOIS_API_KEY` is not set. The freshly-registered signal is not raised in that case.

**What's needed**
- Pick a provider: WhoisXML API or RDAP direct (free, but rate-limited). Use RDAP first; fall back to a paid provider only if rate limits bite.

### 6.5 OCR for scanned documents

**What's stubbed**
- The text extractors fall back to PDF text-layer parsing only. If a document is a scan with no text layer, no fields are extracted and signals depending on extracted fields aren't raised. The report will be `partial`.

**What's needed**
- Pick an OCR option: Tesseract (free, local, slow), AWS Textract (paid, fast, accurate), or Anthropic Claude with vision (already in the dependency tree if Anthropic is wired). Recommend Claude vision — leverages a dependency we're already adding for the AI summary layer.

---

## 7. Out of scope (deferred — do not build in this sprint)

- **Decision rendering by AI** — the AI never says approve or reject. If a future request asks for it, escalate.
- **Bulk re-screening** — one prospect at a time. Bulk comes later if landlords ask.
- **Cross-landlord fraud detection** — the same fake pay stub appearing across multiple landlords. Compelling but requires a network effect threshold and a separate privacy review.
- **Automated approval workflows** — even with all green signals, the landlord clicks Approve manually.
- **Portfolio-level pricing tiers** — pricing decisions belong in `app/lib/billing/` (which doesn't exist yet). Charge model is per-Rentbase subscription tier, decided separately.
- **Tenant-facing screening result share** — applicants do not see their own report. They see "your application is under review" only.
- **Real-time fraud feed** — the engine runs on-demand, not on a schedule. No background polling.

---

## 8. Open questions for founder before Phase 1

**Status:** ✅ Answered by founder on 2026-04-26. Phase 2 is unblocked.

1. **Storage bucket name.** ✅ `application-documents` (use the spec's default).
2. **AI provider.** ✅ Anthropic Claude (matches the leasing assistant — one fewer account to manage).
3. **Reverse-phone provider.** ✅ Twilio Lookup (Twilio account already wired for the SMS line).
4. **Sidebar placement of audit page.** ✅ Merge into the existing Compliance page, not a standalone route. Keeps the sidebar from growing.
5. **Eviction-check requirement in dev.** ✅ Not required — report can complete without it. Flip the env var to required only once an eviction-database partner is integrated.

---

## 9. References

- Source idea: Ideabrowser project `2dea0440-13bf-4e3c-8989-42e4b41db0a9`
- Fair-housing pattern: `app/lib/leasing/fair-housing-guardrails.ts`, CLAUDE.md hard rule #4
- Migration convention: `db/migrations/2026_04_22_inspections.sql`
- Schema convention: `app/lib/schemas/inspection.ts`
- Audit page convention: `app/dashboard/leasing-assistant/audit/page.tsx`
- Storage convention: `app/lib/storage/photos.ts`
- Sprint spec convention: `docs/SPRINT-13-NEEDS.md`
