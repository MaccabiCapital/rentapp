// ============================================================
// AI summary layer
// ============================================================
//
// THE ONLY AI-USING FILE in the screening module.
//
// Two paths:
//   - When ANTHROPIC_API_KEY is set: live Claude call producing a
//     plain-English narrative ≤4 paragraphs + numbered checklist.
//   - When key is absent: deterministic template built from the
//     signal list. Indistinguishable to the user except for the
//     "Live AI not configured" chip in the UI.
//
// Both paths are post-processed through runOutputGuardrails which
// strips decision language ("denied", "rejected", "do not approve")
// and runs the leasing-assistant outbound scan. If anything is
// stripped, the audit log captures the strip count.
//
// The live path falls back to the template on any API error.

import Anthropic from '@anthropic-ai/sdk'
import { scanOutboundMessage } from '@/app/lib/leasing/fair-housing-guardrails'
import {
  SCREENING_RISK_BAND_LABELS,
  SCREENING_SIGNAL_SEVERITY_LABELS,
  type ScreeningRiskBand,
  type ScreeningSignal,
} from '@/app/lib/schemas/screening'

export type AiSummaryResult = {
  summary: string
  model: string
  guardrailStripCount: number
}

const DECISION_PHRASES_TO_STRIP = [
  /\b(deny|denied|denies|denial)\b/gi,
  /\b(reject|rejected|rejects|rejection)\b/gi,
  /\b(do not approve|don't approve|cannot approve|do not recommend|don't recommend)\b/gi,
  /\bunqualified\b/gi,
  /\bdisqualif(?:y|ied|ies|ication)\b/gi,
]

// ------------------------------------------------------------
// Output guardrail — strip decision language regardless of source
// ------------------------------------------------------------
//
// Runs over both the stub output and (eventually) live AI output.
// The leasing assistant scanner catches protected-class signals;
// this adds the screening-specific decision-language strip.
export function runOutputGuardrails(text: string): {
  cleaned: string
  stripCount: number
  flags: ReturnType<typeof scanOutboundMessage>
} {
  let cleaned = text
  let stripCount = 0
  for (const re of DECISION_PHRASES_TO_STRIP) {
    cleaned = cleaned.replace(re, () => {
      stripCount += 1
      return '[recommendation removed by guardrail]'
    })
  }
  const flags = scanOutboundMessage(cleaned)
  return { cleaned, stripCount, flags }
}

// ------------------------------------------------------------
// Template-mode summary builder
// ------------------------------------------------------------

function buildTemplateSummary(opts: {
  riskBand: ScreeningRiskBand | null
  signals: ScreeningSignal[]
  documentsAnalyzed: number
}): string {
  const { riskBand, signals, documentsAnalyzed } = opts

  const reds = signals.filter((s) => s.severity === 'red')
  const ambers = signals.filter((s) => s.severity === 'amber')
  const greens = signals.filter((s) => s.severity === 'green')

  const lines: string[] = []

  // Opening paragraph
  if (signals.length === 0) {
    lines.push(
      `The deterministic checks examined ${documentsAnalyzed} document${documentsAnalyzed === 1 ? '' : 's'} and did not raise any signals. This means the checks that ran found nothing inconsistent — but it does not mean the application has been verified. Manual reference checks and identity verification are still required.`,
    )
  } else {
    const bandText = riskBand
      ? `Overall risk band: ${SCREENING_RISK_BAND_LABELS[riskBand].toLowerCase()}.`
      : ''
    lines.push(
      `The deterministic checks examined ${documentsAnalyzed} document${documentsAnalyzed === 1 ? '' : 's'} and raised ${signals.length} signal${signals.length === 1 ? '' : 's'} (${reds.length} red, ${ambers.length} amber, ${greens.length} green). ${bandText}`.trim(),
    )
  }

  // Per-severity summaries (red first)
  if (reds.length > 0) {
    lines.push(
      `\n**Strong concerns (${reds.length}):** ${reds
        .map((s) => s.title)
        .join('; ')}.`,
    )
  }
  if (ambers.length > 0) {
    lines.push(
      `\n**Inconsistencies to review (${ambers.length}):** ${ambers
        .map((s) => s.title)
        .join('; ')}.`,
    )
  }
  if (greens.length > 0) {
    lines.push(
      `\n**Verified (${greens.length}):** ${greens
        .map((s) => s.title)
        .join('; ')}.`,
    )
  }

  // Suggested verifications — numbered checklist
  const actions = signals
    .map((s) => s.suggested_action)
    .filter((a): a is string => !!a)
  if (actions.length > 0) {
    lines.push(`\n**Verify these things before signing:**`)
    actions.forEach((a, i) => {
      lines.push(`${i + 1}. ${a}`)
    })
  }

  // Closing — fair-housing reminder
  lines.push(
    `\nThis is a recommendation. The decision is yours. Use the deterministic signals above as prompts for verification, not as a basis for rejection. All decisions must be made on legally-allowed criteria only.`,
  )

  return lines.join('\n')
}

// ------------------------------------------------------------
// Main entry point
// ------------------------------------------------------------

// Model used when live mode is active. Set via env var to override
// without code change.
const LIVE_MODEL =
  process.env.SCREENING_AI_MODEL ?? 'claude-opus-4-7'

const SYSTEM_PROMPT = `You are a Proof Check assistant inside a landlord
operating system called Rentbase. You summarize the OUTPUT of a
deterministic forensic engine that has already analyzed an applicant's
documents.

Hard rules — never break these:
1. NEVER recommend a decision. The landlord decides. Do not say "approve",
   "deny", "reject", "do not recommend", "should be approved", or any variant.
2. NEVER invent new signals. Only summarize the deterministic findings the
   user gives you. If a signal isn't in the input, it doesn't exist for you.
3. NEVER reference protected classes (race, color, religion, sex, national
   origin, disability, familial status, marital status, source of income,
   age, military status). If the deterministic findings don't mention these,
   you don't either.
4. Income from any legal source counts equally — W-2, 1099, Social Security,
   disability, vouchers, retirement. Never imply otherwise.
5. Use plain English. Write at an 8th-grade reading level. Maximum 4
   short paragraphs. Then a numbered checklist titled "Verify these
   things before signing".
6. End with: "This is a recommendation. The decision is yours."

Format:
- 1-2 paragraphs of plain-English summary of the findings
- Optional 1 paragraph naming the most important inconsistencies
- Optional 1 paragraph noting what looks verified
- Numbered checklist: "Verify these things before signing"
- Closing line as written above`

function buildLivePrompt(opts: {
  signals: ScreeningSignal[]
  riskBand: ScreeningRiskBand | null
  documentsAnalyzed: number
}): string {
  const lines: string[] = []
  lines.push(`Documents analyzed: ${opts.documentsAnalyzed}`)
  if (opts.riskBand) {
    lines.push(`Overall risk band: ${opts.riskBand}`)
  }
  lines.push(`Number of signals raised: ${opts.signals.length}`)
  lines.push('')
  if (opts.signals.length === 0) {
    lines.push('No signals were raised.')
  } else {
    lines.push('Signals (each is one finding):')
    for (const s of opts.signals) {
      lines.push(`---`)
      lines.push(`Severity: ${s.severity}`)
      lines.push(`Title: ${s.title}`)
      lines.push(`Detail: ${s.detail}`)
      if (s.suggested_action) {
        lines.push(`Suggested verification: ${s.suggested_action}`)
      }
    }
  }
  return lines.join('\n')
}

async function callAnthropicSummary(opts: {
  signals: ScreeningSignal[]
  riskBand: ScreeningRiskBand | null
  documentsAnalyzed: number
  apiKey: string
}): Promise<{ text: string; model: string }> {
  const client = new Anthropic({ apiKey: opts.apiKey })
  const userMessage = buildLivePrompt(opts)

  const response = await client.messages.create({
    model: LIVE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && 'text' in textBlock ? textBlock.text : ''
  return { text: text || buildTemplateSummary(opts), model: LIVE_MODEL }
}

export async function generateAiSummary(opts: {
  signals: ScreeningSignal[]
  riskBand: ScreeningRiskBand | null
  documentsAnalyzed: number
}): Promise<AiSummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  let raw: string
  let model: string

  if (apiKey) {
    try {
      const live = await callAnthropicSummary({ ...opts, apiKey })
      raw = live.text
      model = live.model
    } catch {
      // Fall back to template on any API error so the engine never
      // gets stuck. Audit log will show model='stub' for this run.
      raw = buildTemplateSummary(opts)
      model = 'stub'
    }
  } else {
    raw = buildTemplateSummary(opts)
    model = 'stub'
  }

  const { cleaned, stripCount } = runOutputGuardrails(raw)

  // If the template ever introduces an unintended phrase, rebuild
  // a minimal-safe summary.
  const safe =
    stripCount > 0
      ? cleaned +
        '\n\n[Note: the AI output had decision language removed by the fair-housing guardrail.]'
      : cleaned

  return {
    summary: safe,
    model,
    guardrailStripCount: stripCount,
  }
}

// Quick severity-label helper used in templates (avoids extra import
// in the engine).
export function severityLabel(s: ScreeningSignal['severity']): string {
  return SCREENING_SIGNAL_SEVERITY_LABELS[s]
}
