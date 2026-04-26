-- ============================================================
-- Proof Check — Forensic Tenant Screening
-- ============================================================
-- Apply: paste into Supabase SQL editor and run.
--
-- Three tables + audit log:
--   application_documents   — files uploaded with an application
--                             (pay stubs, bank statements, employer
--                             letter, ID). One row per file.
--   screening_reports       — one row per Proof Check run on a
--                             prospect. Stores summary, AI narrative,
--                             overall risk band.
--   screening_signals       — individual signals raised by the
--                             deterministic engine. One row per
--                             signal per report.
--   screening_audit_log     — append-only event log (FCRA / 7-year
--                             retention).
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
  'tax_return',
  'reference_letter',
  'other'
);

create type screening_report_status as enum (
  'pending',
  'running',
  'complete',
  'partial',
  'error'
);

create type screening_risk_band as enum (
  'green',
  'amber',
  'red'
);

create type screening_signal_severity as enum (
  'green',
  'amber',
  'red'
);

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
  'eviction_record_match',
  'eviction_record_alias_match',
  'identity_verification_failed',
  'address_history_inconsistent',
  'reference_phone_unreachable'
);

-- ------------------------------------------------------------
-- application_documents
-- ------------------------------------------------------------

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  prospect_id uuid references public.prospects(id) on delete cascade,
  public_application_token uuid,

  kind application_document_kind not null,
  storage_path text not null,
  original_filename text not null,
  byte_size integer not null,
  mime_type text not null,

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

create policy "owners select on application_documents"
  on public.application_documents for select using (owner_id = auth.uid());
create policy "owners insert on application_documents"
  on public.application_documents for insert with check (owner_id = auth.uid());
create policy "owners update on application_documents"
  on public.application_documents for update using (owner_id = auth.uid());
create policy "owners delete on application_documents"
  on public.application_documents for delete using (owner_id = auth.uid());

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
  risk_band screening_risk_band,

  ai_summary text,
  ai_summary_model text,
  ai_summary_generated_at timestamptz,

  eviction_check_provider text,
  eviction_check_completed_at timestamptz,
  identity_check_provider text,
  identity_check_completed_at timestamptz,

  stated_income_monthly numeric(10, 2),
  stated_employer text,
  stated_employer_phone text,
  stated_employer_email text,

  landlord_decision text,
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

create policy "owners select on screening_reports"
  on public.screening_reports for select using (owner_id = auth.uid());
create policy "owners insert on screening_reports"
  on public.screening_reports for insert with check (owner_id = auth.uid());
create policy "owners update on screening_reports"
  on public.screening_reports for update using (owner_id = auth.uid());
create policy "owners delete on screening_reports"
  on public.screening_reports for delete using (owner_id = auth.uid());

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

  title text not null,
  detail text not null,
  suggested_action text,

  source_document_ids uuid[] default '{}',
  evidence_json jsonb,

  created_at timestamptz not null default now()
);

create index screening_signals_owner_idx on public.screening_signals (owner_id);
create index screening_signals_report_idx on public.screening_signals (report_id);
create index screening_signals_severity_idx on public.screening_signals (severity);

alter table public.screening_signals enable row level security;

create policy "owners select on screening_signals"
  on public.screening_signals for select using (owner_id = auth.uid());
create policy "owners insert on screening_signals"
  on public.screening_signals for insert with check (owner_id = auth.uid());
create policy "owners update on screening_signals"
  on public.screening_signals for update using (owner_id = auth.uid());
create policy "owners delete on screening_signals"
  on public.screening_signals for delete using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- screening_audit_log — append-only, 7-year retention
-- ------------------------------------------------------------

create table public.screening_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.screening_reports(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,

  event text not null,
  event_data jsonb,

  actor_user_id uuid,
  actor_kind text not null,

  created_at timestamptz not null default now()
);

create index screening_audit_log_owner_idx on public.screening_audit_log (owner_id);
create index screening_audit_log_report_idx on public.screening_audit_log (report_id);
create index screening_audit_log_prospect_idx on public.screening_audit_log (prospect_id);
create index screening_audit_log_created_idx on public.screening_audit_log (created_at desc);

alter table public.screening_audit_log enable row level security;

create policy "owners select on screening_audit_log"
  on public.screening_audit_log for select using (owner_id = auth.uid());
create policy "owners insert on screening_audit_log"
  on public.screening_audit_log for insert with check (owner_id = auth.uid());
-- No update or delete policies. Audit log is append-only.

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;
