// ============================================================
// Rule pack types
// ============================================================
//
// A rule is pure data + a pure match function. No IO, no Supabase,
// no LLM. Each rule has a stable id so compliance_findings.rule_id
// stays queryable across rule-pack revisions.

import type {
  FhFindingSeverity,
  FhProtectedClass,
} from '@/app/lib/schemas/compliance'

export type RuleMatch = {
  triggerText: string
  evidence?: Record<string, unknown>
}

export type ListingScanRule = {
  id: string
  jurisdiction: string
  severity: FhFindingSeverity
  title: string
  detail: string
  suggestedFix: string | null
  implicatedClasses: FhProtectedClass[]
  match: (copy: string) => RuleMatch[]
}

export type RulePack = {
  jurisdiction: string
  jurisdictionName: string
  listingRules: ListingScanRule[]
}
