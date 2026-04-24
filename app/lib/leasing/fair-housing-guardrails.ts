// ============================================================
// Fair-housing guardrails — deterministic filter layer
// ============================================================
//
// This module sits between the LLM and every message that enters
// or leaves a leasing conversation. It is load-bearing for the
// fair-housing safe-harbor pattern in CLAUDE.md:
//
//   1. Deterministic rules engine makes the actual decision on
//      legally-allowed signals.
//   2. AI layer provides summary / explanation only — never the
//      decision.
//   3. Human makes the final call; AI output is labeled as a
//      recommendation, not a decision.
//   4. Never auto-reject — unqualified prospects can still apply.
//   5. Always disclosed with a compliance note.
//   6. Always logged for 3+ years (FCRA retention standard).
//
// This module's job is narrow:
//   (a) Scan INBOUND prospect messages for protected-class
//       disclosures and flag them to the landlord. We do NOT
//       redact — the landlord reads the raw message. The flag
//       just reminds them, per fair-housing training, to ignore
//       those signals in their decision.
//   (b) Scan OUTBOUND draft messages (AI or human) for language
//       that could create fair-housing exposure: decision words
//       ("approved", "denied", "we can't accept"), references to
//       protected classes, or source-of-income filtering.
//   (c) Expose the SYSTEM_PROMPT constant that wraps any LLM
//       call with the non-negotiable rules.
//
// Heuristics are intentionally aggressive. Better to flag a
// safe message than to miss an exposed one. False positives
// surface as an amber warning the landlord dismisses; false
// negatives create legal exposure.

export type InputWarning =
  | 'disclosed_race_or_ethnicity'
  | 'disclosed_religion'
  | 'disclosed_national_origin'
  | 'disclosed_familial_status'
  | 'disclosed_disability'
  | 'disclosed_sex_or_gender_identity'
  | 'disclosed_sexual_orientation'
  | 'disclosed_age_of_minor'
  | 'disclosed_source_of_income'

export type OutputFlag =
  | 'contains_decision_language'
  | 'references_protected_class'
  | 'implies_source_of_income_filtering'
  | 'contains_discriminatory_phrasing'

export type InputWarningDetail = {
  type: InputWarning
  match: string
  note: string
}

export type OutputFlagDetail = {
  type: OutputFlag
  match: string
  note: string
}

// ------------------------------------------------------------
// System prompt — wrapped around every LLM call
// ------------------------------------------------------------
//
// This is the ONE-SOURCE-OF-TRUTH system prompt. It is NOT
// user-editable (the custom_system_prompt column on a
// conversation is appended AFTER this, not replacing it).

export const LEASING_ASSISTANT_SYSTEM_PROMPT = `
You are a leasing assistant drafting replies on behalf of the landlord or
property manager. You DO NOT make any housing decisions. You are drafting
a suggestion for a human to review, edit, and send.

FAIR-HOUSING RULES — non-negotiable:

1. NEVER state or imply approval, denial, or any housing decision. The
   landlord decides. Even if the prospect explicitly asks "am I approved?"
   — respond that the landlord reviews applications and will follow up.

2. NEVER reference, acknowledge, or use any protected-class signal that
   the prospect may have disclosed. Protected classes include race, color,
   religion, sex, gender identity, sexual orientation, national origin,
   disability, familial status (having children, being pregnant, marital
   status), or source of income (Section 8, voucher, disability income).

3. NEVER filter or screen based on source of income. If the prospect
   mentions a Housing Choice Voucher, Section 8, SSI/SSDI, or any other
   legal source of income, respond in a way that is equally welcoming
   as to any other prospect.

4. NEVER auto-reject. If a prospect appears unqualified based on any
   hard criteria (income, credit, eviction history), still invite them
   to apply. The decision is the landlord's.

5. NEVER reference the property's neighborhood in terms that could imply
   redlining (demographics, "good schools in terms of kids", ethnic
   character of the area, etc.). Keep neighborhood descriptions factual
   and amenity-based (distance to transit, shops, parks).

6. When in doubt, be brief and defer: "The landlord will review your
   application and be in touch."

STYLE:

- Warm, professional, grammatical.
- 1-4 sentences for a first reply. Longer only when answering specific
  questions.
- Do NOT promise things the landlord hasn't authorized (price reductions,
  pet permissions, early move-in dates, parking spots, etc.).
- Do NOT ask for personal information beyond what the listing or
  application form requires. Never ask about family, religion, ethnicity,
  disabilities, or immigration status.

You are a DRAFT generator. The human ALWAYS reviews before anything is
sent to the prospect.
`.trim()

// ------------------------------------------------------------
// Input scanner — detects protected-class disclosures
// ------------------------------------------------------------
//
// Pattern list is imperfect but aggressive. Updated as edge cases
// surface. Keep rules English-language-aware only for v1.

type InputRule = {
  type: InputWarning
  pattern: RegExp
  note: string
}

const INPUT_RULES: InputRule[] = [
  // Familial status — very common in rental inquiries
  {
    type: 'disclosed_familial_status',
    pattern:
      /\b(my|our)\s+(kids?|children|baby|babies|toddler|son|daughter|family)\b/i,
    note:
      'Prospect mentioned children or family. Fair housing: familial status is a protected class — do not factor this into your decision.',
  },
  {
    type: 'disclosed_familial_status',
    pattern: /\bpregnan[ct]/i,
    note:
      'Prospect mentioned pregnancy. Familial status is protected — do not factor into your decision.',
  },
  {
    type: 'disclosed_familial_status',
    pattern: /\b(married|husband|wife|spouse|partner|girlfriend|boyfriend)\b/i,
    note:
      'Prospect mentioned marital / relationship status. Some jurisdictions protect marital status — do not factor into your decision.',
  },

  // Disability
  {
    type: 'disclosed_disability',
    pattern:
      /\b(disabled|disability|wheelchair|handicap|assistive|ada|autistic|autism|service animal|emotional support|esa)\b/i,
    note:
      'Prospect mentioned disability or assistive needs. Disability is a protected class. Service animals and ESAs are reasonable accommodations — not "pets" — and cannot be refused via a no-pets policy. Do not factor disability into your decision.',
  },

  // Source of income
  {
    type: 'disclosed_source_of_income',
    pattern:
      /\b(section\s*8|housing\s*(choice\s*)?voucher|hcv|hud|ssdi|ssi|snap|welfare|food\s*stamps|disability\s*income|va\s*benefits)\b/i,
    note:
      'Prospect mentioned a legal source of income (voucher, benefit, etc.). Source of income is protected in many jurisdictions; source-of-income filtering is illegal in those places. Do not refuse based on payment source.',
  },

  // Religion
  {
    type: 'disclosed_religion',
    pattern:
      /\b(christian|catholic|jewish|muslim|hindu|buddhist|atheist|synagogue|church|mosque|temple|hijab|yarmulke|kosher|halal)\b/i,
    note:
      'Prospect mentioned religion or a religious practice. Religion is a protected class — do not factor into your decision.',
  },

  // Race / ethnicity / national origin
  {
    type: 'disclosed_national_origin',
    pattern:
      /\b(from|originally from|moving from)\s+(mexico|india|china|korea|russia|ukraine|ethiopia|nigeria|syria|iran|pakistan|bangladesh|philippines|vietnam|guatemala|venezuela)\b/i,
    note:
      'Prospect mentioned national origin or immigration context. National origin is a protected class — do not factor into your decision.',
  },
  {
    type: 'disclosed_race_or_ethnicity',
    pattern:
      /\b(black|white|asian|hispanic|latino|latina|latinx|african\s*american|caucasian|arab|middle\s*eastern|indigenous|native\s*american)\b/i,
    note:
      'Prospect mentioned race or ethnicity. Race is a protected class — do not factor into your decision.',
  },

  // Sex / gender identity / sexual orientation
  {
    type: 'disclosed_sex_or_gender_identity',
    pattern:
      /\b(transgender|trans\s*(woman|man|person)|non[-\s]?binary|ftm|mtf|cisgender|they\/them)\b/i,
    note:
      'Prospect mentioned gender identity. Sex / gender identity is protected under federal fair-housing rules — do not factor into your decision.',
  },
  {
    type: 'disclosed_sexual_orientation',
    pattern: /\b(gay|lesbian|bisexual|queer|lgbtq)\b/i,
    note:
      'Prospect mentioned sexual orientation. Protected in many jurisdictions — do not factor into your decision.',
  },

  // Age of minors (already covered by familial status, but add an extra
  // signal when a specific age of a child is mentioned)
  {
    type: 'disclosed_age_of_minor',
    pattern: /\b(\d+)[- ]?(month|yr|year)[-s]?\s*(old)?\b.*\b(kid|child|baby)/i,
    note:
      'Prospect mentioned the age of a child. Familial status is protected — do not factor into your decision.',
  },
]

export function scanInboundMessage(text: string): InputWarningDetail[] {
  const results: InputWarningDetail[] = []
  const seen = new Set<string>()
  for (const rule of INPUT_RULES) {
    const m = text.match(rule.pattern)
    if (m) {
      const key = `${rule.type}:${m[0].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ type: rule.type, match: m[0], note: rule.note })
    }
  }
  return results
}

// ------------------------------------------------------------
// Output scanner — detects problematic phrasing in drafts
// ------------------------------------------------------------

type OutputRule = {
  type: OutputFlag
  pattern: RegExp
  note: string
}

const OUTPUT_RULES: OutputRule[] = [
  // Decision language
  {
    type: 'contains_decision_language',
    pattern:
      /\b(you\s+are|you're)\s+(approved|denied|rejected|accepted|qualified|unqualified|disqualified)\b/i,
    note:
      'This message appears to state an approval / denial decision. The AI must not issue housing decisions — only the landlord does. Rewrite to defer ("the landlord will review your application and be in touch").',
  },
  {
    type: 'contains_decision_language',
    pattern:
      /\b(we\s+(cannot|can't|won't|will\s+not)|unfortunately\s+we\s+(cannot|can't))\s+(rent|lease|accept|approve|consider)\b/i,
    note:
      'This message refuses the prospect. The AI must not auto-reject — every prospect should be invited to apply; the landlord decides.',
  },
  {
    type: 'contains_decision_language',
    pattern: /\b(congratulations|you got it|you're in|welcome home)\b/i,
    note:
      'This message implies approval. The AI must not convey decisions. Rewrite to a neutral next-step message.',
  },

  // Protected class references
  {
    type: 'references_protected_class',
    pattern:
      /\b(family\s*friendly|no\s*kids|adults?\s*only|(not|no)\s+suitable\s+for\s+(kids|children|families))\b/i,
    note:
      'This message filters or comments on familial status (protected). Do not mention kid-friendliness, "adults only," etc.',
  },
  {
    type: 'references_protected_class',
    pattern:
      /\b(christian|church[-\s]going|religious|muslim|jewish|catholic)\s+(community|neighborhood|area|household)\b/i,
    note:
      'This message describes the property by religious character. Religion is protected. Rewrite without religious descriptors.',
  },
  {
    type: 'references_protected_class',
    pattern:
      /\b(good|bad|rough|safe)\s+(school\s+district|schools)\b/i,
    note:
      'Statements about school quality can imply redlining / familial-status steering. Keep neighborhood descriptions factual (distance-based) rather than judging school quality.',
  },

  // Source of income filtering
  {
    type: 'implies_source_of_income_filtering',
    pattern:
      /\b(no\s+)?(section\s*8|voucher|hcv)\s*(accepted|allowed|welcome)?\b/i,
    note:
      'This message references Section 8 / voucher status. Source of income is protected in many jurisdictions. Rewrite to be neutral or remove the reference.',
  },
  {
    type: 'implies_source_of_income_filtering',
    pattern: /\b(w-?2|1099|employment|job)\s+(income|only|required)\b/i,
    note:
      'This message suggests an income-type filter. Source of income is protected — a qualified prospect with disability income, VA benefits, alimony, etc. must be considered.',
  },

  // Discriminatory phrasing
  {
    type: 'contains_discriminatory_phrasing',
    pattern:
      /\b(we\s+prefer|ideal\s+tenant|perfect\s+for|best\s+suited\s+for)\s+.*\b(couple|single|young|older|retiree|professional|student)\b/i,
    note:
      'Stating a preference for a demographic category can imply a discriminatory filter. Rewrite to describe the UNIT (quiet neighborhood, close to transit) rather than the PERSON.',
  },
]

export function scanOutboundMessage(text: string): OutputFlagDetail[] {
  const results: OutputFlagDetail[] = []
  const seen = new Set<string>()
  for (const rule of OUTPUT_RULES) {
    const m = text.match(rule.pattern)
    if (m) {
      const key = `${rule.type}:${m[0].toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ type: rule.type, match: m[0], note: rule.note })
    }
  }
  return results
}

// ------------------------------------------------------------
// Persisted flag shape on leasing_messages.guardrail_flags
// ------------------------------------------------------------

export type GuardrailFlags = {
  input_warnings?: InputWarningDetail[]
  output_flags?: OutputFlagDetail[]
  reviewed_at?: string
}

export function inboundFlagsFor(content: string): GuardrailFlags {
  const warnings = scanInboundMessage(content)
  return warnings.length > 0 ? { input_warnings: warnings } : {}
}

export function outboundFlagsFor(content: string): GuardrailFlags {
  const flags = scanOutboundMessage(content)
  return flags.length > 0 ? { output_flags: flags } : {}
}

// Labels for UI rendering
export const INPUT_WARNING_LABELS: Record<InputWarning, string> = {
  disclosed_race_or_ethnicity: 'Race / ethnicity mentioned',
  disclosed_religion: 'Religion mentioned',
  disclosed_national_origin: 'National origin mentioned',
  disclosed_familial_status: 'Family / children mentioned',
  disclosed_disability: 'Disability / assistive animal mentioned',
  disclosed_sex_or_gender_identity: 'Gender identity mentioned',
  disclosed_sexual_orientation: 'Sexual orientation mentioned',
  disclosed_age_of_minor: "Child's age mentioned",
  disclosed_source_of_income: 'Source of income disclosed',
}

export const OUTPUT_FLAG_LABELS: Record<OutputFlag, string> = {
  contains_decision_language: 'Contains decision language',
  references_protected_class: 'References a protected class',
  implies_source_of_income_filtering: 'Implies source-of-income filtering',
  contains_discriminatory_phrasing: 'Contains discriminatory phrasing',
}
