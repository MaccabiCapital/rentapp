// ============================================================
// Listing description AI copy generator
// ============================================================
//
// Two paths, identical to the screening AI summary:
//   - When ANTHROPIC_API_KEY is set: live Claude call producing
//     friendly, fair-housing-safe listing copy (~120 words).
//   - When key is absent: deterministic template built from the
//     property/unit facts. The UI shows a "Live AI not configured"
//     chip so the landlord knows.
//
// Both paths are post-processed through the deterministic
// listing-scanner. If the generator ever produces flagged copy
// (preference language, protected-class words, etc.) the result
// is annotated with the findings so the landlord can edit before
// saving. The generator does NOT auto-save — the landlord pastes
// or rejects.
//
// Hard rules (also encoded in the system prompt):
//   - No protected-class language: race, color, religion, sex,
//     national origin, familial status, disability, age, source
//     of income, marital status, military.
//   - No preference language: "ideal for", "perfect for",
//     "no kids", "professional only", etc.
//   - No exclusion language: "no Section 8", "must have W-2".
//   - Plain English at an 8th-grade reading level.
//   - 80–160 words. Lead with the unit, not the demographic.

import Anthropic from '@anthropic-ai/sdk'
import { scanListingCopyDeterministic } from '@/app/lib/compliance/listing-scanner'
import type { ComplianceFindingDraft } from '@/app/lib/compliance/signal-builders'

export type ListingCopyContext = {
  propertyName: string
  city: string | null
  state: string | null
  unitNumber: string | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  monthlyRent: number | null
  availableOn: string | null
  // Optional landlord-provided seed: e.g. "near transit, recently
  // renovated, washer-dryer in unit". The generator weaves these
  // facts in but never invents new ones.
  highlights: string | null
}

export type ListingCopyResult = {
  description: string
  model: 'stub' | string
  scanFindings: ComplianceFindingDraft[]
  guardrailStripCount: number
}

const LIVE_MODEL =
  process.env.LISTING_COPY_AI_MODEL ?? 'claude-opus-4-7'

const SYSTEM_PROMPT = `You write rental-listing descriptions for an
operating system used by independent landlords called Rentbase.

Hard rules — never break these:
1. NEVER use protected-class language. No mentions of race, color,
   religion, sex/gender, national origin, familial status,
   disability, age, source of income, marital status, or military
   status. No "ideal for", "perfect for", "no kids", "professional
   only", "no Section 8", "must have W-2", "Christian household",
   "single only", "young couple".
2. NEVER invent facts. Only use what the user supplies. If
   bedrooms or square feet are missing, just don't mention them.
3. NEVER promise things that aren't in the input. Don't add
   "pet-friendly", "parking included", "utilities included" unless
   the highlights list contains them.
4. Lead with the unit (location, layout, what's there), not the
   tenant. "Bright two-bedroom in Davis Square" — not "Looking for
   a quiet professional".
5. Plain English at an 8th-grade reading level. 80-160 words.
   Two short paragraphs at most.
6. End with a single line that invites inquiries — e.g.
   "Available [date]. Reach out to schedule a showing."

Tone: warm, factual, specific. Avoid clichés like "must see",
"won't last", "luxury living". Avoid emojis. No all-caps.`

const DECISION_PHRASES_TO_STRIP = [
  // Belt-and-suspenders strip; the deterministic listing-scanner
  // does the real work but these phrases never belong in a listing
  // even if the AI tries to be "helpful".
  /\bideal for [^.]+/gi,
  /\bperfect for [^.]+/gi,
  /\bno (kids|children|families)\b/gi,
  /\bprofessionals? only\b/gi,
  /\bno section ?8\b/gi,
  /\bmust have w[- ]?2\b/gi,
  /\bsingles? only\b/gi,
]

function runOutputGuardrails(text: string): {
  cleaned: string
  stripCount: number
} {
  let cleaned = text
  let stripCount = 0
  for (const re of DECISION_PHRASES_TO_STRIP) {
    cleaned = cleaned.replace(re, () => {
      stripCount += 1
      return '[removed]'
    })
  }
  return { cleaned, stripCount }
}

function formatRent(value: number | null): string {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ------------------------------------------------------------
// Template-mode description builder
// ------------------------------------------------------------

function buildTemplateDescription(ctx: ListingCopyContext): string {
  const lead: string[] = []

  // Lead sentence: "Bright two-bedroom in Davis Square"-shaped
  const bedText =
    ctx.bedrooms && ctx.bedrooms > 0
      ? `${numberToWord(ctx.bedrooms)}-bedroom`
      : 'studio'
  const placePart = [ctx.city, ctx.state].filter(Boolean).join(', ')
  if (placePart) {
    lead.push(`A ${bedText} rental in ${placePart}.`)
  } else {
    lead.push(`A ${bedText} rental at ${ctx.propertyName}.`)
  }

  // Layout sentence
  const layout: string[] = []
  if (ctx.bedrooms && ctx.bedrooms > 0)
    layout.push(`${ctx.bedrooms} bedroom${ctx.bedrooms === 1 ? '' : 's'}`)
  if (ctx.bathrooms && ctx.bathrooms > 0)
    layout.push(`${ctx.bathrooms} bath${ctx.bathrooms === 1 ? '' : 's'}`)
  if (ctx.squareFeet && ctx.squareFeet > 0)
    layout.push(`${ctx.squareFeet.toLocaleString()} sq ft`)
  if (layout.length > 0) {
    lead.push(`The unit features ${layout.join(', ')}.`)
  }

  // Highlights — the landlord's seed words
  if (ctx.highlights && ctx.highlights.trim().length > 0) {
    lead.push(ctx.highlights.trim())
  }

  // Closing — rent + availability + invite
  const close: string[] = []
  const rent = formatRent(ctx.monthlyRent)
  if (rent) close.push(`Rent is ${rent} per month.`)
  const avail = formatDate(ctx.availableOn)
  if (avail) close.push(`Available ${avail}.`)
  close.push('Reach out to schedule a showing.')

  return [lead.join(' '), close.join(' ')].join('\n\n')
}

function numberToWord(n: number): string {
  const map = [
    'studio',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
  ]
  if (n >= 0 && n < map.length) return map[n]
  return n.toString()
}

// ------------------------------------------------------------
// Live AI mode
// ------------------------------------------------------------

function buildLivePrompt(ctx: ListingCopyContext): string {
  const lines: string[] = []
  lines.push('Write a rental listing description from these facts.')
  lines.push('')
  lines.push(`Property name: ${ctx.propertyName}`)
  if (ctx.unitNumber) lines.push(`Unit: ${ctx.unitNumber}`)
  if (ctx.city || ctx.state) {
    lines.push(`Location: ${[ctx.city, ctx.state].filter(Boolean).join(', ')}`)
  }
  if (ctx.bedrooms !== null) lines.push(`Bedrooms: ${ctx.bedrooms}`)
  if (ctx.bathrooms !== null) lines.push(`Bathrooms: ${ctx.bathrooms}`)
  if (ctx.squareFeet !== null) lines.push(`Square feet: ${ctx.squareFeet}`)
  if (ctx.monthlyRent !== null)
    lines.push(`Monthly rent: ${formatRent(ctx.monthlyRent)}`)
  if (ctx.availableOn) lines.push(`Available on: ${formatDate(ctx.availableOn)}`)
  if (ctx.highlights && ctx.highlights.trim().length > 0) {
    lines.push('')
    lines.push('Highlights to weave in (do not invent additional features):')
    lines.push(ctx.highlights.trim())
  }
  lines.push('')
  lines.push('Output the description only — no preamble, no list of facts.')
  return lines.join('\n')
}

async function callAnthropic(
  ctx: ListingCopyContext,
  apiKey: string,
): Promise<{ text: string; model: string }> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: LIVE_MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildLivePrompt(ctx) }],
  })
  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''
  return { text: text || buildTemplateDescription(ctx), model: LIVE_MODEL }
}

// ------------------------------------------------------------
// Main entry point
// ------------------------------------------------------------

export async function generateListingCopy(opts: {
  context: ListingCopyContext
  jurisdiction: string
}): Promise<ListingCopyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  let raw: string
  let model: ListingCopyResult['model']

  if (apiKey) {
    try {
      const live = await callAnthropic(opts.context, apiKey)
      raw = live.text
      model = live.model
    } catch {
      // Fall back silently to the template; audit log will show
      // the model field as 'stub' for the run.
      raw = buildTemplateDescription(opts.context)
      model = 'stub'
    }
  } else {
    raw = buildTemplateDescription(opts.context)
    model = 'stub'
  }

  const { cleaned, stripCount } = runOutputGuardrails(raw)
  const description = stripCount > 0
    ? `${cleaned}\n\n[Note: removed phrasing that could trigger fair-housing review. Re-read before publishing.]`
    : cleaned

  // Run the deterministic listing scanner against the cleaned copy
  // so the UI can warn if anything still slips past. This is the
  // same scanner that runs on the listing detail page.
  const scan = scanListingCopyDeterministic({
    copy: description,
    jurisdiction: opts.jurisdiction,
    listingId: null,
  })

  return {
    description,
    model,
    scanFindings: scan.findings,
    guardrailStripCount: stripCount,
  }
}
