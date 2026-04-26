// ============================================================
// Federal listing-scan rules (FHA baseline)
// ============================================================
//
// 7 protected classes: race, color, religion, sex/gender,
// national origin, familial status, disability.
//
// Each rule's regex set targets the most-cited HUD enforcement
// patterns in advertising. Citations: HUD Office of Fair Housing
// and Equal Opportunity guidance + Diane J. Smith v. Eric Webster
// pattern set.
//
// All rules in this file have id prefix 'fed.' so the rule_id
// remains stable as state add-ons attach.

import type { ListingScanRule, RuleMatch } from './_types'

function regexMatches(re: RegExp, copy: string): RuleMatch[] {
  const matches: RuleMatch[] = []
  let m: RegExpExecArray | null
  // Reset for safety with /g flags
  re.lastIndex = 0
  while ((m = re.exec(copy)) !== null) {
    matches.push({ triggerText: m[0] })
    if (!re.global) break
  }
  return matches
}

const PHRASES = (terms: string[]) =>
  new RegExp(`\\b(?:${terms.join('|')})\\b`, 'gi')

export const FEDERAL_LISTING_RULES: ListingScanRule[] = [
  // ----------------------------------------------------------
  // Familial status — single largest source of HUD complaints
  // ----------------------------------------------------------
  {
    id: 'fed.familial.exclusion',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Excludes families with children (familial status)',
    detail:
      'Phrases that exclude or discourage families with children are a violation of the Fair Housing Act. "No kids", "adults only", "mature only", and similar phrases are not permitted in advertising. The only narrow exception is HUD-certified senior housing.',
    suggestedFix:
      'Remove the exclusion. If this is HUD-certified senior housing, replace with the specific HOPA citation language. Otherwise the unit must be open to families with children.',
    implicatedClasses: ['familial_status'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'no\\s+kids',
          'no\\s+children',
          'adults?\\s+only',
          'mature\\s+only',
          'mature\\s+(?:adults?|tenants?)',
          'no\\s+(?:young\\s+)?(?:families|children\\s+allowed)',
          'one\\s+occupant\\s+only',
          '(?:single\\s+person|single\\s+occupant)\\s+only',
          'single\\s+adult\\s+only',
          'no\\s+toys',
          'no\\s+strollers',
        ]),
        copy,
      ),
  },
  {
    id: 'fed.familial.preference',
    jurisdiction: 'US',
    severity: 'amber',
    title: 'Phrases targeting "professionals" / non-family renters',
    detail:
      'Targeting "young professionals", "single professionals", or similar groups can be interpreted as discouraging families with children. HUD has prosecuted these phrases when used in advertising.',
    suggestedFix:
      'Describe the unit, not the desired tenant. Replace "perfect for young professionals" with "convenient for commuters" or remove the line entirely.',
    implicatedClasses: ['familial_status', 'age'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'perfect\\s+for\\s+(?:young\\s+)?professionals?',
          'ideal\\s+for\\s+(?:young\\s+)?professionals?',
          'great\\s+for\\s+(?:young\\s+)?professionals?',
          'professional\\s+(?:tenants?|renters?)',
          'no\\s+roommates?',
        ]),
        copy,
      ),
  },
  {
    id: 'fed.familial.steering',
    jurisdiction: 'US',
    severity: 'amber',
    title: 'Steering language ("great for families")',
    detail:
      'Phrases that steer specific demographics (positive or negative) violate the FHA when they imply preference. "Perfect for families", "ideal for couples", or "best suited for X" can all be interpreted as steering.',
    suggestedFix:
      'Replace with a description of the unit features. Instead of "perfect for families", write "3 bedrooms, fenced yard, near elementary school".',
    implicatedClasses: ['familial_status'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          '(?:perfect|ideal|great|best)\\s+for\\s+(?:families|couples)',
          'best\\s+suited\\s+for',
          'family\\s+(?:home|residence|environment)',
          'family[-\\s]?friendly',
        ]),
        copy,
      ),
  },

  // ----------------------------------------------------------
  // Religion
  // ----------------------------------------------------------
  {
    id: 'fed.religion.preference',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Religious preference language',
    detail:
      'Stating preference for or against any religion is a violation of the FHA. Even "Christian household" or "must respect Sabbath" can be interpreted as discriminatory.',
    suggestedFix:
      'Remove the religious reference entirely. If you have noise hours or quiet hours, state them as policies (e.g. "Quiet hours 10pm-7am").',
    implicatedClasses: ['religion'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'christian',
          'jewish',
          'muslim',
          'catholic',
          'hindu',
          'buddhist',
          'church',
          'synagogue',
          'mosque',
          'temple',
          'sabbath',
          'kosher',
          'halal',
        ]),
        copy,
      ),
  },
  {
    id: 'fed.religion.proximity',
    jurisdiction: 'US',
    severity: 'amber',
    title: 'Proximity to religious institution',
    detail:
      'Highlighting proximity to a specific religious institution (e.g. "two blocks from St. Mary\'s") may steer renters of that religion. HUD has flagged this in enforcement actions.',
    suggestedFix:
      'Replace with neutral landmarks: "near the elementary school" or "in the historic district".',
    implicatedClasses: ['religion'],
    match: (copy) =>
      regexMatches(
        /\b(?:near|next\s+to|across\s+from|minutes?\s+(?:from|to))\s+(?:st\.?|saint|holy|temple|mosque|church)\b/gi,
        copy,
      ),
  },

  // ----------------------------------------------------------
  // National origin
  // ----------------------------------------------------------
  {
    id: 'fed.national_origin.language',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Language requirement (English only)',
    detail:
      'Requiring "English only" speakers or excluding non-native English speakers is national-origin discrimination under the FHA. Reasonable English ability for lease comprehension can be discussed individually but cannot be advertised.',
    suggestedFix:
      'Remove the language requirement from the ad.',
    implicatedClasses: ['national_origin'],
    match: (copy) =>
      regexMatches(
        /\b(?:english\s+only|english[-\s]?speaking\s+(?:only|tenants?))\b/gi,
        copy,
      ),
  },

  // ----------------------------------------------------------
  // Disability
  // ----------------------------------------------------------
  {
    id: 'fed.disability.exclusion',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Excludes people with disabilities or service animals',
    detail:
      'No-pets policies are LEGAL, but they cannot be applied to verified service animals or emotional support animals (ESAs) — these are reasonable accommodations under the FHA. Wording the policy as "no pets" without exemption language can be interpreted as discriminatory.',
    suggestedFix:
      'Use "No pets — service animals and ESAs welcome with documentation" instead of plain "No pets".',
    implicatedClasses: ['disability'],
    match: (copy) =>
      regexMatches(
        /\b(?:no\s+(?:service\s+animals?|esas?|assistance\s+animals?))\b/gi,
        copy,
      ),
  },
  {
    id: 'fed.disability.targeting',
    jurisdiction: 'US',
    severity: 'amber',
    title: 'Phrases that target or exclude based on physical ability',
    detail:
      'Phrases like "must be able to climb stairs", "fit and active only", or "not suitable for elderly" can be interpreted as disability discrimination. State physical features of the unit (e.g. "3rd-floor walk-up, no elevator") instead.',
    suggestedFix:
      'Replace ability requirements with factual descriptions of the unit features.',
    implicatedClasses: ['disability', 'age'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'able[-\\s]?bodied',
          'fit\\s+(?:tenants?|adults?)',
          'active\\s+(?:tenants?|adults?)',
          'must\\s+(?:be\\s+able\\s+to\\s+)?climb\\s+stairs',
          'not\\s+suitable\\s+for\\s+(?:elderly|seniors?|disabled)',
          'wheelchair[-\\s]?inaccessible',
        ]),
        copy,
      ),
  },

  // ----------------------------------------------------------
  // Race / color
  // ----------------------------------------------------------
  {
    id: 'fed.race.preference',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Race or color reference in listing',
    detail:
      'Any reference to race or color of preferred or excluded tenants is a per-se violation of the Fair Housing Act, regardless of intent.',
    suggestedFix:
      'Remove the reference entirely.',
    implicatedClasses: ['race', 'color'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          'whites?\\s+only',
          'caucasian',
          'all[-\\s]?american',
          'integrated\\s+(?:building|neighborhood)',
        ]),
        copy,
      ),
  },

  // ----------------------------------------------------------
  // Sex / gender
  // ----------------------------------------------------------
  {
    id: 'fed.sex.preference',
    jurisdiction: 'US',
    severity: 'red',
    title: 'Sex / gender preference',
    detail:
      'Restricting tenancy to a specific sex or gender (e.g. "female only", "men only") violates the FHA. The narrow exception is shared living spaces with shared bathrooms — see HUD\'s Roommate Rule.',
    suggestedFix:
      'Remove the gender restriction. If this is a shared bedroom in a shared house, you can mention it as a shared-living preference, not a rental requirement.',
    implicatedClasses: ['sex_or_gender'],
    match: (copy) =>
      regexMatches(
        PHRASES([
          '(?:female|woman|women|girls?)\\s+only',
          '(?:male|man|men|boys?)\\s+only',
          'no\\s+(?:males|men|females|women)',
        ]),
        copy,
      ),
  },
]
