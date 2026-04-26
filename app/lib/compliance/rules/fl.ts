// ============================================================
// Florida — listing scan add-ons
// ============================================================
//
// Florida follows the federal FHA baseline at the state level.
// Source-of-income protection exists at the county/city level
// in Miami-Dade and Broward.
//
// Source: Florida Fair Housing Act (FS 760) + Miami-Dade County
// Code Chapter 11A + Broward County Code Chapter 16½.

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

export const FLORIDA_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'fl.soi.miami_broward_check',
    jurisdiction: 'FL',
    severity: 'amber',
    title: 'Refuses Section 8 / vouchers (statewide FL: legal; Miami-Dade + Broward restrict)',
    detail:
      'Florida does NOT protect source of income statewide. Miami-Dade County (Code 11A) and Broward County (Code 16½) prohibit voucher refusal. Confirm the property\'s county before publishing.',
    suggestedFix:
      'For Miami-Dade or Broward properties: remove the refusal.',
    implicatedClasses: ['source_of_income'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+section\\s+8',
          'no\\s+vouchers?',
          'no\\s+housing\\s+(?:assistance|choice)',
          'cash\\s+only',
        ]),
        copy,
      ),
  },
  {
    id: 'fl.lgbtq.county_check',
    jurisdiction: 'FL',
    severity: 'amber',
    title: 'LGBTQ exclusion (FL: federal Bostock interpretation)',
    detail:
      'Florida does not statutorily protect sexual orientation or gender identity in state housing law. However, federal courts following Bostock v. Clayton County have extended FHA "sex" protections to include LGBTQ tenants, and several FL counties (Miami-Dade, Broward, Orange, Hillsborough) explicitly include them.',
    suggestedFix:
      'Remove the exclusion. Federal interpretation is unsettled but trending against discrimination on this basis.',
    implicatedClasses: ['sexual_orientation', 'gender_identity'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:gay|lesbian|lgbt|lgbtq)',
          '(?:straight|hetero(?:sexual)?)\\s+(?:tenants?|only)',
        ]),
        copy,
      ),
  },
  {
    id: 'fl.deposit_disclosure',
    jurisdiction: 'FL',
    severity: 'info',
    title: 'Deposit reference (FL requires written disclosure of where deposit is held)',
    detail:
      'Florida law (FS 83.49) requires landlords to disclose, in writing within 30 days of receiving the deposit, the bank where the deposit is held and whether interest is earned. This isn\'t a listing-content issue but worth knowing.',
    suggestedFix:
      'Send the FS 83.49 disclosure to the tenant within 30 days of receiving the deposit. The notice template is in your Compliance reference cards.',
    implicatedClasses: [],
    match: (copy) =>
      regexMatches(
        /\b(?:security\s+)?deposit[:\s]*\$?[\d,]+(?:\.\d{2})?/gi,
        copy,
      ),
  },
]
