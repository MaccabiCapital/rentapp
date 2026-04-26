// ============================================================
// California — listing scan add-ons (FEHA)
// ============================================================
//
// California adds source-of-income protection (SB 329 — includes
// Section 8) and Fair Chance Act protections for criminal history.
// Plus broader protections for sexual orientation, gender
// identity, marital status, military status, immigration status.

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

export const CALIFORNIA_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'ca.soi.section_8',
    jurisdiction: 'CA',
    severity: 'red',
    title: 'Refuses Section 8 / housing vouchers (CA SB 329)',
    detail:
      'California protects source of income, including Section 8 and other housing assistance vouchers, under SB 329 (effective 2020). Refusing voucher holders is a violation of FEHA.',
    suggestedFix:
      'Remove the refusal. Vouchers must be evaluated like any other source of income — count them toward the income-multiple requirement.',
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
    id: 'ca.criminal.lookback',
    jurisdiction: 'CA',
    severity: 'amber',
    title: 'Blanket criminal-history exclusion (CA Fair Chance Act)',
    detail:
      'California\'s Fair Chance Act (AB 1008 / AB 1418) prohibits blanket "no criminal record" exclusions in housing. Criminal history can only be considered after a conditional offer, with an individualized assessment.',
    suggestedFix:
      'Remove the criminal-history exclusion from the listing. After a conditional offer, you may consider relevant convictions on a case-by-case basis with documented assessment.',
    implicatedClasses: ['criminal_history'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:felons?|criminal\\s+(?:record|history|background))',
          'clean\\s+criminal\\s+(?:record|history|background)',
          'must\\s+pass\\s+criminal\\s+(?:background|check)',
          'background\\s+check\\s+required',
        ]),
        copy,
      ),
  },
  {
    id: 'ca.immigration.status',
    jurisdiction: 'CA',
    severity: 'red',
    title: 'Immigration status reference (CA AB 291)',
    detail:
      'California prohibits asking about or considering immigration status in housing decisions (AB 291 / AB 1690). Requiring SSN is allowed but cannot be the sole basis for denial.',
    suggestedFix:
      'Remove citizenship/immigration references. If you need an ITIN as an alternative to SSN, accept it.',
    implicatedClasses: ['immigration_status', 'national_origin'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'us\\s+citizens?\\s+only',
          'must\\s+be\\s+(?:us\\s+)?citizen',
          'no\\s+(?:undocumented|immigrants?)',
          'green\\s+card\\s+required',
          'visa\\s+required',
        ]),
        copy,
      ),
  },
  {
    id: 'ca.application_fee',
    jurisdiction: 'CA',
    severity: 'amber',
    title: 'Application fee reference (CA caps to actual cost)',
    detail:
      'California limits screening fees to the landlord\'s actual cost (currently capped at ~$59.67 indexed annually). Quoting a flat $100+ fee may exceed what\'s permitted.',
    suggestedFix:
      'Document the actual screening cost (credit + background) and only charge that. Most landlords charge $30-50.',
    implicatedClasses: [],
    match: (copy) =>
      regexMatches(
        /\bapplication\s+fee[:\s]*\$?(\d+)/gi,
        copy,
      ),
  },
]
