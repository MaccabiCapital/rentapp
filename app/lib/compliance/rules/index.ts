// ============================================================
// Rule pack index
// ============================================================
//
// loadRulePack(jurisdiction) returns the federal baseline merged
// with state add-ons. Throws if the jurisdiction isn't supported.
//
// Currently with state-specific rules: CA, NY, MI.
// Federal-baseline-only fallback: TX, FL, WA (rule files in a
// follow-up commit).

import type { RulePack, ListingScanRule } from './_types'
import { FEDERAL_LISTING_RULES } from './_federal'
import { CALIFORNIA_LISTING_RULES } from './ca'
import { NEW_YORK_LISTING_RULES } from './ny'
import { MICHIGAN_LISTING_RULES } from './mi'

const STATE_LISTING_RULES: Record<string, ListingScanRule[]> = {
  CA: CALIFORNIA_LISTING_RULES,
  NY: NEW_YORK_LISTING_RULES,
  MI: MICHIGAN_LISTING_RULES,
  // TX, FL, WA: federal baseline only for v1
  TX: [],
  FL: [],
  WA: [],
}

const JURISDICTION_NAMES: Record<string, string> = {
  US: 'United States (federal)',
  CA: 'California',
  NY: 'New York',
  MI: 'Michigan',
  TX: 'Texas',
  FL: 'Florida',
  WA: 'Washington',
}

export function loadRulePack(jurisdiction: string): RulePack {
  const code = jurisdiction.toUpperCase()
  const stateRules = code === 'US' ? [] : (STATE_LISTING_RULES[code] ?? null)

  if (code !== 'US' && stateRules === null) {
    throw new Error(
      `Unsupported jurisdiction: ${jurisdiction}. Supported: US, CA, NY, MI, TX, FL, WA.`,
    )
  }

  return {
    jurisdiction: code,
    jurisdictionName: JURISDICTION_NAMES[code] ?? jurisdiction,
    listingRules: [...FEDERAL_LISTING_RULES, ...(stateRules ?? [])],
  }
}

export const SUPPORTED_JURISDICTIONS = Object.keys(JURISDICTION_NAMES)
