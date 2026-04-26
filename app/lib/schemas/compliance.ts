// ============================================================
// FairScreen (compliance) schemas
// ============================================================
//
// Mirrors the migration db/migrations/2026_04_26_compliance.sql.
// Process-side fair-housing automation. Sibling to Proof Check
// (which is the screening side, focused on applicant docs).
//
// Hard rule reminder (CLAUDE.md #4 + FAIRSCREEN-SPEC §1):
// - Engine raises findings deterministically; AI summarizes only.
// - Disparate-impact engine NEVER reads name, email, phone, or
//   address (bias-neutrality is a Phase-11 acceptance test).
// - Public marketing blocked until attorney review of the
//   rendered criteria PDF (post-Phase-7).

import * as z from 'zod'

// ------------------------------------------------------------
// Finding source
// ------------------------------------------------------------

export const FH_FINDING_SOURCE_VALUES = [
  'listing_scan',
  'question_audit',
  'outbound_message_scan',
  'inbound_message_scan',
  'disparate_impact',
  'criteria_compliance_check',
] as const

export type FhFindingSource = (typeof FH_FINDING_SOURCE_VALUES)[number]

export const FH_FINDING_SOURCE_LABELS: Record<FhFindingSource, string> = {
  listing_scan: 'Listing copy',
  question_audit: 'Application question',
  outbound_message_scan: 'Outbound message',
  inbound_message_scan: 'Inbound message',
  disparate_impact: 'Disparate impact',
  criteria_compliance_check: 'Tenant selection criteria',
}

// ------------------------------------------------------------
// Finding severity
// ------------------------------------------------------------

export const FH_FINDING_SEVERITY_VALUES = ['info', 'amber', 'red'] as const
export type FhFindingSeverity = (typeof FH_FINDING_SEVERITY_VALUES)[number]

export const FH_FINDING_SEVERITY_LABELS: Record<FhFindingSeverity, string> = {
  info: 'Informational',
  amber: 'Review recommended',
  red: 'Material legal exposure',
}

export const FH_FINDING_SEVERITY_BADGE: Record<FhFindingSeverity, string> = {
  info: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
}

// ------------------------------------------------------------
// Finding status
// ------------------------------------------------------------

export const FH_FINDING_STATUS_VALUES = [
  'open',
  'acknowledged',
  'fixed',
  'dismissed',
  'resolved_external',
] as const
export type FhFindingStatus = (typeof FH_FINDING_STATUS_VALUES)[number]

export const FH_FINDING_STATUS_LABELS: Record<FhFindingStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  fixed: 'Fixed',
  dismissed: 'Dismissed',
  resolved_external: 'Resolved (attorney review)',
}

// ------------------------------------------------------------
// Protected classes — landlord-facing labels
// ------------------------------------------------------------

export const FH_PROTECTED_CLASS_VALUES = [
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
  'criminal_history',
  'immigration_status',
] as const

export type FhProtectedClass = (typeof FH_PROTECTED_CLASS_VALUES)[number]

export const FH_PROTECTED_CLASS_LABELS: Record<FhProtectedClass, string> = {
  race: 'Race',
  color: 'Color',
  religion: 'Religion',
  sex_or_gender: 'Sex / gender',
  sexual_orientation: 'Sexual orientation',
  gender_identity: 'Gender identity',
  national_origin: 'National origin',
  familial_status: 'Family / children (familial status)',
  disability: 'Disability',
  source_of_income: 'Source of income (vouchers, SS, etc.)',
  age: 'Age',
  marital_status: 'Marital status',
  military_status: 'Military / veteran status',
  criminal_history: 'Criminal history',
  immigration_status: 'Immigration status',
}

// ------------------------------------------------------------
// Disparate-impact run status
// ------------------------------------------------------------

export const FH_DI_STATUS_VALUES = [
  'pending',
  'running',
  'complete',
  'partial',
  'error',
] as const
export type FhDiStatus = (typeof FH_DI_STATUS_VALUES)[number]

export const FH_DI_STATUS_LABELS: Record<FhDiStatus, string> = {
  pending: 'Queued',
  running: 'Running…',
  complete: 'Complete',
  partial: 'Partial',
  error: 'Error',
}

// ------------------------------------------------------------
// DB row shapes
// ------------------------------------------------------------

export type StateFairHousingRule = {
  id: string
  jurisdiction: string
  jurisdiction_name: string
  protected_classes_added: FhProtectedClass[]
  protects_source_of_income: boolean
  soi_notes: string | null
  fair_chance_housing_law: boolean
  fair_chance_notes: string | null
  max_application_fee_cents: number | null
  application_fee_notes: string | null
  required_application_disclosures: string[] | null
  income_multiple_max: number | null
  income_multiple_notes: string | null
  source_url: string | null
  source_title: string | null
  effective_date: string | null
  last_verified_on: string | null
  verified_by: string | null
  is_researched: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type TenantSelectionCriteria = {
  id: string
  owner_id: string
  name: string
  jurisdiction: string
  income_multiple: number | null
  min_credit_score: number | null
  max_evictions_lookback_years: number | null
  max_eviction_count: number | null
  accepts_section_8: boolean | null
  accepts_other_vouchers: boolean | null
  criminal_history_lookback_years: number | null
  criminal_history_excludes: string[] | null
  pet_policy: string | null
  occupancy_max_per_bedroom: number | null
  additional_requirements: string | null
  reasonable_accommodations_statement: string | null
  is_compliant: boolean
  compliance_findings_count: number
  last_scanned_at: string | null
  pdf_storage_path: string | null
  auto_attach_to_new_listings: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ComplianceFinding = {
  id: string
  owner_id: string
  source: FhFindingSource
  severity: FhFindingSeverity
  status: FhFindingStatus
  subject_listing_id: string | null
  subject_criteria_id: string | null
  subject_message_id: string | null
  subject_question_id: string | null
  subject_di_run_id: string | null
  subject_prospect_id: string | null
  title: string
  detail: string
  trigger_text: string | null
  suggested_fix: string | null
  implicated_classes: FhProtectedClass[]
  jurisdiction: string
  rule_id: string | null
  dismissed_reason: string | null
  dismissed_at: string | null
  dismissed_by: string | null
  evidence_json: unknown
  created_at: string
  updated_at: string
}

export type ComplianceAuditLogEntry = {
  id: string
  owner_id: string
  finding_id: string | null
  criteria_id: string | null
  di_run_id: string | null
  event: string
  event_data: unknown
  actor_user_id: string | null
  actor_kind: string
  created_at: string
}

// ------------------------------------------------------------
// Form-input schemas
// ------------------------------------------------------------

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

export const ScanListingCopySchema = z.object({
  listing_id: optionalText,
  jurisdiction: z
    .string()
    .trim()
    .min(2, { error: 'Pick a jurisdiction.' }),
  copy: z
    .string()
    .trim()
    .min(1, { error: 'Paste some listing copy to scan.' })
    .max(20000, { error: 'Keep listing copy under 20,000 characters.' }),
})
export type ScanListingCopyInput = z.infer<typeof ScanListingCopySchema>

export const DismissFindingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: 'A reason is required for the audit log.' })
    .max(500),
})
export type DismissFindingInput = z.infer<typeof DismissFindingSchema>
