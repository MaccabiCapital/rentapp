// ============================================================
// Michigan — listing scan add-ons (Elliott-Larsen Civil Rights Act)
// ============================================================
//
// Source: MCL 37.2102 (Elliott-Larsen) as amended by PA 6 of 2023
// (effective 2024-03-31), which formally codified sexual
// orientation + gender identity as protected classes statewide.
//
// Michigan-specific protected classes beyond the federal seven:
//   - age
//   - sexual_orientation
//   - gender_identity
//   - marital_status
//   - HEIGHT (statewide — one of very few states)
//   - WEIGHT (statewide — one of very few states)
//
// Notes for v1:
//   - height + weight are NOT in the fh_protected_class enum.
//     The two rules below that target them use 'sex_or_gender'
//     as a placeholder protected-class link to ensure the
//     finding still surfaces; a follow-up enum extension
//     would let us tag them precisely.
//   - Source of income is NOT statewide-protected. Local
//     ordinances apply in Ann Arbor, East Lansing, Lansing.
//   - Local rent control is preempted by PA 226 of 1988.

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

export const MICHIGAN_LISTING_RULES: ListingScanRule[] = [
  {
    id: 'mi.age.preference',
    jurisdiction: 'MI',
    severity: 'red',
    title: 'Age preference (MI Elliott-Larsen)',
    detail:
      'Michigan\'s Elliott-Larsen Civil Rights Act protects against age discrimination in housing. Preferring or excluding tenants based on age (other than HOPA-certified senior housing) is a violation.',
    suggestedFix:
      'Remove age references. Describe the unit, not the desired tenant.',
    implicatedClasses: ['age'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'young\\s+(?:adults?|tenants?|renters?)',
          'older\\s+(?:adults?|tenants?|renters?)',
          'seniors?\\s+only',
          'no\\s+(?:young|elderly|senior)\\s+(?:adults?|tenants?|renters?)',
          'age\\s+(?:21|25|30|35|40|45|50|55|60)\\s*\\+?',
          '(?:21|25|30|35|40|45|50|55|60)\\s*\\+\\s+(?:only|preferred)',
        ]),
        copy,
      ),
  },
  {
    id: 'mi.lgbtq.exclusion',
    jurisdiction: 'MI',
    severity: 'red',
    title: 'LGBTQ exclusion (MI Elliott-Larsen, PA 6 of 2023)',
    detail:
      'Sexual orientation and gender identity are protected classes statewide in Michigan, codified by Public Act 6 of 2023 (effective March 2024). Listing language excluding LGBTQ tenants violates Elliott-Larsen.',
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
    id: 'mi.marital.preference',
    jurisdiction: 'MI',
    severity: 'red',
    title: 'Marital status preference (MI Elliott-Larsen)',
    detail:
      'Michigan protects marital status under Elliott-Larsen. Phrases like "married couples only", "no singles", or "single tenants only" are violations.',
    suggestedFix:
      'Remove the marital-status restriction.',
    implicatedClasses: ['marital_status'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'married\\s+(?:couples?|tenants?|only)',
          'no\\s+singles?',
          'single\\s+(?:tenants?|adults?|renters?)\\s+only',
          'unmarried\\s+couples?\\s+(?:not\\s+)?(?:welcome|accepted|allowed)?',
        ]),
        copy,
      ),
  },
  {
    id: 'mi.height_weight.preference',
    jurisdiction: 'MI',
    severity: 'amber',
    title: 'Height or weight reference (MI is one of few states protecting these)',
    detail:
      'Michigan is one of very few US states that protect HEIGHT and WEIGHT as housing-discrimination categories under Elliott-Larsen. Any reference to applicant size in a listing is potentially actionable here.',
    suggestedFix:
      'Remove any reference to applicant height or weight. Describe physical features of the unit instead (e.g., "low ceilings — under 6\'6" advised" is still risky; just describe the unit).',
    implicatedClasses: ['sex_or_gender'],  // enum placeholder; height/weight not yet in enum
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+(?:tall|short|heavy|overweight)',
          'fit\\s+(?:applicants?|tenants?)',
          'slim\\s+(?:applicants?|tenants?)',
          'must\\s+be\\s+(?:tall|short|petite|small|large)',
        ]),
        copy,
      ),
  },
  {
    id: 'mi.soi.local_check',
    jurisdiction: 'MI',
    severity: 'amber',
    title: 'Refuses Section 8 / vouchers (statewide MI: legal; check city ordinance)',
    detail:
      'Michigan does NOT protect source of income statewide — refusing Section 8 voucher holders is legal under state law. HOWEVER, local ordinances in Ann Arbor, East Lansing, Lansing, and a few other cities make voucher refusal illegal. Confirm the property\'s city ordinance before publishing this listing.',
    suggestedFix:
      'If the property is in Ann Arbor / East Lansing / Lansing or any city with a local SOI ordinance, remove the refusal. Otherwise it is legal under state law but commercially limiting.',
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
    id: 'mi.deposit_amount',
    jurisdiction: 'MI',
    severity: 'red',
    title: 'Security deposit exceeds Michigan cap (1.5x monthly rent — MCL 554.602)',
    detail:
      'Michigan caps security deposits at 1.5 times the monthly rent (MCL 554.602). A listing advertising a deposit higher than that exposes the landlord to penalty under MCL 554.613.',
    suggestedFix:
      'Reduce the advertised deposit to no more than 1.5x the monthly rent.',
    implicatedClasses: [],
    match: (copy) => {
      const out: RuleMatch[] = []
      // Look for "deposit ... $X" patterns; the heuristic flags
      // any mention of a dollar deposit amount for landlord
      // review, since we'd need the rent to validate the multiple.
      const re = /\b(?:security\s+)?deposit[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(copy)) !== null) {
        const amount = Number(m[1].replace(/,/g, ''))
        if (Number.isFinite(amount) && amount >= 1500) {
          // Heuristic: deposits > $1500 are worth reviewing
          // against MI's 1.5x cap. Real check requires the rent.
          out.push({
            triggerText: m[0],
            evidence: { advertised_deposit: amount },
          })
        }
      }
      return out
    },
  },
]
