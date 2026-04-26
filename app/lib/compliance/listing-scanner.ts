// ============================================================
// Listing copy scanner
// ============================================================
//
// Runs the federal + state rule pack against listing copy and
// returns finding drafts. Pure function — no Supabase, no IO.
// The server action is what persists results.

import { loadRulePack } from './rules'
import {
  buildListingFinding,
  type ComplianceFindingDraft,
} from './signal-builders'

export type ListingScanResult = {
  jurisdiction: string
  rulesEvaluated: number
  findings: ComplianceFindingDraft[]
}

export function scanListingCopyDeterministic(opts: {
  copy: string
  jurisdiction: string
  listingId?: string | null
}): ListingScanResult {
  const pack = loadRulePack(opts.jurisdiction)
  const drafts: ComplianceFindingDraft[] = []

  for (const rule of pack.listingRules) {
    const matches = rule.match(opts.copy)
    for (const match of matches) {
      drafts.push(
        buildListingFinding({
          rule,
          match,
          listingId: opts.listingId ?? null,
        }),
      )
    }
  }

  // De-duplicate findings that hit the same rule_id with the same
  // trigger_text — a phrase appearing twice shouldn't produce two
  // findings.
  const seen = new Set<string>()
  const deduped: ComplianceFindingDraft[] = []
  for (const d of drafts) {
    const key = `${d.rule_id}::${(d.trigger_text ?? '').toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(d)
  }

  return {
    jurisdiction: pack.jurisdiction,
    rulesEvaluated: pack.listingRules.length,
    findings: deduped,
  }
}
