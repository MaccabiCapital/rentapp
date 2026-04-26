// ============================================================
// Proof Check (forensic tenant screening) schemas
// ============================================================
//
// Mirrors public.application_documents, public.screening_reports,
// public.screening_signals, public.screening_audit_log in
// db/migrations/2026_04_26_screening.sql.
//
// Engine never uses AI. Risk-band is computed deterministically
// from signal severities. AI is allowed only as a summary
// narrative (see app/lib/screening/ai-summary.ts).

import * as z from 'zod'

// ------------------------------------------------------------
// Document kind
// ------------------------------------------------------------

export const APPLICATION_DOCUMENT_KIND_VALUES = [
  'pay_stub',
  'bank_statement',
  'employment_letter',
  'photo_id',
  'tax_return',
  'reference_letter',
  'other',
] as const

export type ApplicationDocumentKind =
  (typeof APPLICATION_DOCUMENT_KIND_VALUES)[number]

export const APPLICATION_DOCUMENT_KIND_LABELS: Record<
  ApplicationDocumentKind,
  string
> = {
  pay_stub: 'Pay stub',
  bank_statement: 'Bank statement',
  employment_letter: 'Employment letter',
  photo_id: 'Photo ID',
  tax_return: 'Tax return',
  reference_letter: 'Reference letter',
  other: 'Other',
}

// ------------------------------------------------------------
// Report status
// ------------------------------------------------------------

export const SCREENING_REPORT_STATUS_VALUES = [
  'pending',
  'running',
  'complete',
  'partial',
  'error',
] as const

export type ScreeningReportStatus =
  (typeof SCREENING_REPORT_STATUS_VALUES)[number]

export const SCREENING_REPORT_STATUS_LABELS: Record<
  ScreeningReportStatus,
  string
> = {
  pending: 'Queued',
  running: 'Running…',
  complete: 'Complete',
  partial: 'Partial (some checks unavailable)',
  error: 'Error',
}

// ------------------------------------------------------------
// Risk band — deterministic, never AI-set
// ------------------------------------------------------------

export const SCREENING_RISK_BAND_VALUES = ['green', 'amber', 'red'] as const
export type ScreeningRiskBand = (typeof SCREENING_RISK_BAND_VALUES)[number]

export const SCREENING_RISK_BAND_LABELS: Record<ScreeningRiskBand, string> = {
  green: 'No red flags',
  amber: 'Review needed',
  red: 'Strong concerns',
}

export const SCREENING_RISK_BAND_BADGE: Record<ScreeningRiskBand, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
}

// ------------------------------------------------------------
// Signal severity — same enum as risk band, used per-signal
// ------------------------------------------------------------

export const SCREENING_SIGNAL_SEVERITY_VALUES = [
  'green',
  'amber',
  'red',
] as const
export type ScreeningSignalSeverity =
  (typeof SCREENING_SIGNAL_SEVERITY_VALUES)[number]

export const SCREENING_SIGNAL_SEVERITY_LABELS: Record<
  ScreeningSignalSeverity,
  string
> = {
  green: 'Verified',
  amber: 'Inconsistent',
  red: 'Strong concern',
}

export const SCREENING_SIGNAL_SEVERITY_BADGE: Record<
  ScreeningSignalSeverity,
  string
> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
}

// ------------------------------------------------------------
// Signal kinds + landlord-facing labels (one-line summary)
// ------------------------------------------------------------

export const SCREENING_SIGNAL_KIND_VALUES = [
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
  'reference_phone_unreachable',
] as const

export type ScreeningSignalKind =
  (typeof SCREENING_SIGNAL_KIND_VALUES)[number]

export const SCREENING_SIGNAL_KIND_LABELS: Record<
  ScreeningSignalKind,
  string
> = {
  pdf_metadata_anomaly:
    'PDF was edited after creation — possible tampering',
  pdf_font_inconsistency:
    "Pay stub fonts don't match — possible edit",
  pdf_image_overlay_detected:
    'Image was pasted over text in the PDF',
  income_math_inconsistent:
    "Stated income doesn't match what the pay stub shows",
  pay_frequency_mismatch:
    "Pay frequency on the stub doesn't match what was stated",
  bank_deposits_below_stated_income:
    'Bank deposits are well below the stated income',
  employer_phone_burner_or_voip:
    'Employer phone is a burner / VOIP number',
  employer_phone_reused_across_applicants:
    "This employer phone was used in another applicant's file",
  employer_email_domain_invalid:
    "Employer email domain doesn't have valid mail records",
  employer_email_domain_freshly_registered:
    'Employer email domain is brand new (created recently)',
  eviction_record_match:
    'Eviction record matches this applicant',
  eviction_record_alias_match:
    'Possible eviction record under an alias',
  identity_verification_failed:
    'Identity verification did not pass',
  address_history_inconsistent:
    "Stated address history doesn't match public records",
  reference_phone_unreachable:
    "Reference's phone number is unreachable",
}

// ------------------------------------------------------------
// Zod row shapes
// ------------------------------------------------------------

export const ApplicationDocumentSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  prospect_id: z.string().uuid().nullable(),
  public_application_token: z.string().uuid().nullable(),
  kind: z.enum(APPLICATION_DOCUMENT_KIND_VALUES),
  storage_path: z.string(),
  original_filename: z.string(),
  byte_size: z.number().int(),
  mime_type: z.string(),
  uploaded_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>

export const ScreeningReportSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  prospect_id: z.string().uuid(),
  status: z.enum(SCREENING_REPORT_STATUS_VALUES),
  risk_band: z.enum(SCREENING_RISK_BAND_VALUES).nullable(),
  ai_summary: z.string().nullable(),
  ai_summary_model: z.string().nullable(),
  ai_summary_generated_at: z.string().nullable(),
  eviction_check_provider: z.string().nullable(),
  eviction_check_completed_at: z.string().nullable(),
  identity_check_provider: z.string().nullable(),
  identity_check_completed_at: z.string().nullable(),
  stated_income_monthly: z.number().nullable(),
  stated_employer: z.string().nullable(),
  stated_employer_phone: z.string().nullable(),
  stated_employer_email: z.string().nullable(),
  landlord_decision: z.string().nullable(),
  landlord_decision_at: z.string().nullable(),
  landlord_decision_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})
export type ScreeningReport = z.infer<typeof ScreeningReportSchema>

export const ScreeningSignalSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  report_id: z.string().uuid(),
  kind: z.enum(SCREENING_SIGNAL_KIND_VALUES),
  severity: z.enum(SCREENING_SIGNAL_SEVERITY_VALUES),
  title: z.string(),
  detail: z.string(),
  suggested_action: z.string().nullable(),
  source_document_ids: z.array(z.string().uuid()),
  evidence_json: z.unknown().nullable(),
  created_at: z.string(),
})
export type ScreeningSignal = z.infer<typeof ScreeningSignalSchema>

export type ScreeningReportWithSignals = ScreeningReport & {
  signals: ScreeningSignal[]
}

export const ScreeningAuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  report_id: z.string().uuid().nullable(),
  prospect_id: z.string().uuid().nullable(),
  event: z.string(),
  event_data: z.unknown().nullable(),
  actor_user_id: z.string().uuid().nullable(),
  actor_kind: z.string(),
  created_at: z.string(),
})
export type ScreeningAuditLogEntry = z.infer<
  typeof ScreeningAuditLogEntrySchema
>

// ------------------------------------------------------------
// Form input schemas
// ------------------------------------------------------------

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

export const RecordDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'requested_more_info'], {
    error: 'Pick a decision.',
  }),
  notes: optionalText,
})
export type RecordDecisionInput = z.infer<typeof RecordDecisionSchema>

// ------------------------------------------------------------
// Display helpers
// ------------------------------------------------------------

export const REPORT_STATUS_BADGE: Record<ScreeningReportStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-700',
  running: 'bg-blue-100 text-blue-800',
  complete: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
