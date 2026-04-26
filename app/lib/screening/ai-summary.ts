// ============================================================
// AI summary layer
// ============================================================
//
// THE ONLY AI-USING FILE in the screening module.
//
// v1 ships in stub mode: no LLM call. The summary is built
// deterministically from the signal list using the same plain-
// English templates the signal builders already use. The model
// field is marked 'stub' so the audit log distinguishes a real
// call from a templated one.
//
// When ANTHROPIC_API_KEY becomes available, replace the body of
// generateAiSummary with a real call. The output MUST pass through
// runOutputGuardrails before being returned (strips decision
// language, protected-class references, source-of-income filtering).

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

export async function generateAiSummary(opts: {
  signals: ScreeningSignal[]
  riskBand: ScreeningRiskBand | null
  documentsAnalyzed: number
}): Promise<AiSummaryResult> {
  // v1: always stub. When ANTHROPIC_API_KEY is configured, swap
  // to a real client.call call here. Preserve runOutputGuardrails
  // post-processing.
  const apiKey = process.env.ANTHROPIC_API_KEY

  let raw: string
  let model: string
  if (apiKey) {
    // Live AI path goes here. Until wired, fall back to template.
    raw = buildTemplateSummary(opts)
    model = 'stub'
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
