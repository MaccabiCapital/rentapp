// ============================================================
// Texas — listing scan add-ons
// ============================================================
//
// Texas largely follows the federal FHA baseline at the state
// level. The major call-outs are city ordinances (Austin and
// Dallas in particular) that add source-of-income protection.
//
// Source: Texas Property Code Chapter 92 + TDHCA fair-housing
// guidance + Austin City Code Article 5-1-1 + Dallas City Code
// 20A-4.

import type { ListingScanRule, RuleMatch } from './_types'

function regexMatches(re: RegExp, copy: string): RuleMatch[] {
  const out: RuleMatch[] = []
  let m: RegExpExecArray | null
  re.lastIndex = 0
  while ((m = re.exec(copy)) !== null) {
    out.push({ triggerText: m[0] })
    if (!re.global) break
  }
  return out
}

const PHRASES = (terms: string[]) =>
  new RegExp(`\\b(?:${terms.join('|')})\\b`, 'gi')

export const TEXAS_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'tx.soi.austin_dallas_check',
    jurisdiction: 'TX',
    severity: 'amber',
    title: 'Refuses Section 8 / vouchers (statewide TX: legal; check city)',
    detail:
      'Texas does NOT protect source of income statewide. HOWEVER, Austin (Article 5-1-1) and Dallas (City Code 20A-4) prohibit voucher refusal at the city level. Confirm the property\'s city before publishing.',
    suggestedFix:
      'For Austin or Dallas properties: remove the refusal. Statewide it is legal but commercially limiting.',
    implicatedClasses: ['source_of_income'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+section\\s+8',
          'no\\s+vouchers?',
          'no\\s+housing\\s+(?:assistance|choice)',
          'cash\\s+only',
          'no\\s+government\\s+(?:assistance|programs?)',
        ]),
        copy,
      ),
  },
  {
    id: 'tx.deposit_no_cap',
    jurisdiction: 'TX',
    severity: 'info',
    title: 'Security deposit reference (TX has no statewide cap)',
    detail:
      'Texas does not cap security deposits at the state level. The amount is whatever you and the tenant agree to in the lease. This rule is informational — verify the deposit amount is reasonable for the local market.',
    suggestedFix:
      'No fix needed unless the deposit is well above local market norms.',
    implicatedClasses: [],
    match: (copy) =>
      regexMatches(
        /\b(?:security\s+)?deposit[:\s]*\$?[\d,]+(?:\.\d{2})?/gi,
        copy,
      ),
  },
  {
    id: 'tx.criminal.austin_check',
    jurisdiction: 'TX',
    severity: 'amber',
    title: 'Blanket criminal exclusion (TX: legal statewide; Austin restricts)',
    detail:
      'No statewide ban-the-box for housing. Austin\'s Fair Chance Hiring Ordinance applies primarily to employment but the City Code increasingly restricts blanket criminal-history exclusions in housing for properties with 16+ units.',
    suggestedFix:
      'If property is in Austin AND has 16+ units, remove the blanket exclusion and use individualized assessment instead.',
    implicatedClasses: ['criminal_history'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:felons?|criminal\\s+(?:record|history|background))',
          'clean\\s+criminal\\s+(?:record|history|background)',
        ]),
        copy,
      ),
  },
]
