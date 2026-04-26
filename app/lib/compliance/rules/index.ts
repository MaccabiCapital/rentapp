// ============================================================
// Rule pack index
// ============================================================
//
// loadRulePack(jurisdiction) returns the federal baseline merged
// with state add-ons. Throws if the jurisdiction isn't supported.
//
// State-specific rules: CA, NY, MI, TX, FL, WA.

import type { RulePack, ListingScanRule } from './_types'
import { FEDERAL_LISTING_RULES } from './_federal'
import { CALIFORNIA_LISTING_RULES } from './ca'
import { NEW_YORK_LISTING_RULES } from './ny'
import { MICHIGAN_LISTING_RULES } from './mi'
import { TEXAS_LISTING_RULES } from './tx'
import { FLORIDA_LISTING_RULES } from './fl'
import { WASHINGTON_LISTING_RULES } from './wa'

const STATE_LISTING_RULES: Record<string, ListingScanRule[]> = {
  CA: CALIFORNIA_LISTING_RULES,
  NY: NEW_YORK_LISTING_RULES,
  MI: MICHIGAN_LISTING_RULES,
  TX: TEXAS_LISTING_RULES,
  FL: FLORIDA_LISTING_RULES,
  WA: WASHINGTON_LISTING_RULES,
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
