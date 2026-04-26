// ============================================================
// Washington — listing scan add-ons
// ============================================================
//
// Washington protects source of income statewide (RCW 59.18.255).
// Plus broader protections under WA Law Against Discrimination
// (RCW 49.60) for sexual orientation, gender identity, marital
// status, military status. Seattle adds Fair Chance Housing
// Ordinance for criminal history.
//
// Source: RCW 59.18.255 + RCW 49.60 + Seattle Municipal Code
// 14.09.

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

export const WASHINGTON_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'wa.soi.section_8',
    jurisdiction: 'WA',
    severity: 'red',
    title: 'Refuses Section 8 / vouchers (RCW 59.18.255)',
    detail:
      'Washington protects source of income statewide under RCW 59.18.255. Refusing Section 8 / housing assistance vouchers is a violation. Penalties include treble damages.',
    suggestedFix:
      'Remove the refusal. Vouchers count toward income for the income-multiple test.',
    implicatedClasses: ['source_of_income'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+section\\s+8',
          'no\\s+vouchers?',
          'no\\s+housing\\s+(?:assistance|choice)',
          'cash\\s+only',
          'no\\s+government\\s+(?:assistance|programs?)',
          'must\\s+have\\s+(?:w[-\\s]?2|paystubs?)\\s+only',
        ]),
        copy,
      ),
  },
  {
    id: 'wa.lgbtq.preference',
    jurisdiction: 'WA',
    severity: 'red',
    title: 'LGBTQ exclusion (WA Law Against Discrimination)',
    detail:
      'Washington protects sexual orientation and gender identity under WA Law Against Discrimination (RCW 49.60). Excluding LGBTQ tenants is a violation.',
    suggestedFix:
      'Remove the exclusion entirely.',
    implicatedClasses: ['sexual_orientation', 'gender_identity'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:gay|lesbian|lgbt|lgbtq)',
          '(?:straight|hetero(?:sexual)?)\\s+(?:tenants?|only)',
          'traditional\\s+(?:family|household|values?)\\s+only',
        ]),
        copy,
      ),
  },
  {
    id: 'wa.criminal.seattle_fair_chance',
    jurisdiction: 'WA',
    severity: 'amber',
    title: 'Blanket criminal exclusion (WA: legal statewide; Seattle restricts heavily)',
    detail:
      'No statewide ban-the-box for housing. Seattle\'s Fair Chance Housing Ordinance (SMC 14.09) prohibits using arrest records and most conviction records in housing decisions. Other WA cities have similar ordinances pending.',
    suggestedFix:
      'For Seattle properties: remove blanket criminal exclusions. Statewide outside Seattle: still legal but trending toward restriction.',
    implicatedClasses: ['criminal_history'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:felons?|criminal\\s+(?:record|history|background))',
          'clean\\s+criminal\\s+(?:record|history|background)',
          'must\\s+pass\\s+criminal\\s+(?:background|check)',
        ]),
        copy,
      ),
  },
  {
    id: 'wa.marital.preference',
    jurisdiction: 'WA',
    severity: 'red',
    title: 'Marital status preference (WA Law Against Discrimination)',
    detail:
      'Washington protects marital status under Law Against Discrimination. "Married couples only", "no singles", or similar preferences are violations.',
    suggestedFix:
      'Remove the marital-status restriction.',
    implicatedClasses: ['marital_status'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'married\\s+(?:couples?|tenants?|only)',
          'no\\s+singles?',
          'single\\s+(?:tenants?|adults?|renters?)\\s+only',
        ]),
        copy,
      ),
  },
  {
    id: 'wa.military.preference',
    jurisdiction: 'WA',
    severity: 'amber',
    title: 'Military / veteran preference (WA Law Against Discrimination)',
    detail:
      'Washington protects military status. "Military only" or "no military" preferences violate WALAD even when intended favorably.',
    suggestedFix:
      'Replace military-targeted language with neutral statements about benefits or VA-loan compatibility.',
    implicatedClasses: ['military_status'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'military\\s+only',
          'no\\s+military',
          'active[-\\s]?duty\\s+only',
          'veterans?\\s+only',
          'no\\s+veterans?',
        ]),
        copy,
      ),
  },
]
