// ============================================================
// Signal-row builder for compliance findings
// ============================================================
//
// Pure function — given a rule + a match, build the row to insert
// into compliance_findings. Centralizes severity / title / detail /
// suggested_fix copy so re-evaluation produces identical rows.

import type {
  FhFindingSource,
  FhFindingSeverity,
  FhProtectedClass,
} from '@/app/lib/schemas/compliance'
import type { ListingScanRule, RuleMatch } from './rules/_types'

export type ComplianceFindingDraft = {
  source: FhFindingSource
  severity: FhFindingSeverity
  title: string
  detail: string
  trigger_text: string | null
  suggested_fix: string | null
  implicated_classes: FhProtectedClass[]
  jurisdiction: string
  rule_id: string
  evidence_json: Record<string, unknown> | null
  subject_listing_id: string | null
  subject_criteria_id: string | null
  subject_message_id: string | null
  subject_question_id: string | null
  subject_di_run_id: string | null
  subject_prospect_id: string | null
}

export function buildListingFinding(opts: {
  rule: ListingScanRule
  match: RuleMatch
  listingId: string | null
}): ComplianceFindingDraft {
  return {
    source: 'listing_scan',
    severity: opts.rule.severity,
    title: opts.rule.title,
    detail: opts.rule.detail,
    trigger_text: opts.match.triggerText,
    suggested_fix: opts.rule.suggestedFix,
    implicated_classes: opts.rule.implicatedClasses,
    jurisdiction: opts.rule.jurisdiction,
    rule_id: opts.rule.id,
    evidence_json: opts.match.evidence ?? null,
    subject_listing_id: opts.listingId,
    subject_criteria_id: null,
    subject_message_id: null,
    subject_question_id: null,
    subject_di_run_id: null,
    subject_prospect_id: null,
  }
}
