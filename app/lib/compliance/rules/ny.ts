// ============================================================
// New York — listing scan add-ons
// ============================================================
//
// NY HSTPA 2019: source-of-income statewide protection. Application
// fee capped at $20. Lawful occupation. Plus state human-rights-law
// protections for sexual orientation, gender identity, age, marital
// status, military status, immigration status.

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

export const NEW_YORK_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'ny.soi.section_8',
    jurisdiction: 'NY',
    severity: 'red',
    title: 'Refuses Section 8 / housing vouchers (NY HSTPA 2019)',
    detail:
      'New York protects source of income statewide under the Housing Stability and Tenant Protection Act of 2019. Refusing voucher holders is a violation of NY Human Rights Law.',
    suggestedFix:
      'Remove the refusal. Vouchers count toward income for the income-multiple test.',
    implicatedClasses: ['source_of_income'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+section\\s+8',
          'no\\s+vouchers?',
          'cash\\s+only',
          'no\\s+government\\s+(?:assistance|programs?)',
        ]),
        copy,
      ),
  },
  {
    id: 'ny.application_fee',
    jurisdiction: 'NY',
    severity: 'red',
    title: 'Application fee exceeds NY cap ($20)',
    detail:
      'NY HSTPA 2019 caps application fees at $20 statewide. Charging more is a violation. The $20 covers any background/credit checks.',
    suggestedFix:
      'Reduce the fee to $20 or less. The cost of background checks above $20 is the landlord\'s expense, not the applicant\'s.',
    implicatedClasses: [],
    match: (copy) => {
      const re = /\bapplication\s+fee[:\s]*\$?(\d+)/gi
      const out: RuleMatch[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(copy)) !== null) {
        const amount = Number(m[1])
        if (amount > 20) {
          out.push({
            triggerText: m[0],
            evidence: { amount },
          })
        }
      }
      return out
    },
  },
  {
    id: 'ny.criminal.nyc_fair_chance',
    jurisdiction: 'NY',
    severity: 'amber',
    title: 'Blanket criminal-history exclusion (NYC Fair Chance for Housing 2024)',
    detail:
      'NYC adopted the Fair Chance for Housing Act in 2024, restricting blanket criminal-history exclusions. Statewide it\'s less restrictive but case law trends in this direction.',
    suggestedFix:
      'For NYC properties: remove blanket criminal exclusions. Consider history only after a conditional offer, with individualized assessment.',
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
  {
    id: 'ny.lawful_occupation',
    jurisdiction: 'NY',
    severity: 'amber',
    title: 'Lawful occupation reference (NY protected class)',
    detail:
      'NY State Human Rights Law protects "lawful occupation". Refusing tenants based on profession (e.g. "no service workers", "no nightlife industry") may be a violation.',
    suggestedFix:
      'Remove occupation-based exclusions or restrictions.',
    implicatedClasses: [],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:service|nightlife|hospitality|gig|tipped)\\s+(?:workers?|employees?)',
          'salaried\\s+(?:employees?|positions?)\\s+only',
          'professional\\s+(?:employment|career)\\s+required',
        ]),
        copy,
      ),
  },
]
