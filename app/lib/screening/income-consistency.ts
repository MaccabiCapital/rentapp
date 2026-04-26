// ============================================================
// Income consistency check
// ============================================================
//
// Compares stated monthly income against the math implied by the
// pay stub. v1 uses simple regex extraction of "gross pay" or
// "year-to-date" figures from PDF text.
//
// Tolerance: <5% delta = no signal. 5-15% = amber.
// >15% = red. The bands match the spec.
//
// Out of scope for v1:
//   - Bank-statement deposit totals
//   - Multi-source income aggregation (W-2 + 1099 + SS)

import {
  incomeMathInconsistent,
  type SignalRow,
} from './signal-builders'

export type IncomeAnalysisResult = {
  signals: SignalRow[]
  observedMonthly: number | null
  payFrequency: PayFrequency | null
}

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

const FREQUENCY_TO_MONTHLY_MULTIPLIER: Record<PayFrequency, number> = {
  weekly: 52 / 12, // ~4.333
  biweekly: 26 / 12, // ~2.167
  semimonthly: 2,
  monthly: 1,
}

// Regex patterns for common pay-stub line items. Real-world pay
// stubs vary wildly — these catch ADP, Paychex, Gusto, and many
// small-payroll formats. Failures fall through to "no observed
// income" which means we just don't raise the signal.
const GROSS_PATTERNS = [
  /gross\s+(?:pay|earnings|wages)[:\s]*\$?([\d,]+\.?\d*)/i,
  /total\s+gross[:\s]*\$?([\d,]+\.?\d*)/i,
  /current\s+gross[:\s]*\$?([\d,]+\.?\d*)/i,
]

const FREQUENCY_PATTERNS: Array<[RegExp, PayFrequency]> = [
  [/pay\s+frequency[:\s]+weekly/i, 'weekly'],
  [/pay\s+frequency[:\s]+bi-?weekly/i, 'biweekly'],
  [/pay\s+frequency[:\s]+semi-?monthly/i, 'semimonthly'],
  [/pay\s+frequency[:\s]+monthly/i, 'monthly'],
  [/pay\s+period[:\s]+weekly/i, 'weekly'],
  [/pay\s+period[:\s]+bi-?weekly/i, 'biweekly'],
  [/pay\s+period[:\s]+semi-?monthly/i, 'semimonthly'],
  [/pay\s+period[:\s]+monthly/i, 'monthly'],
]

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function detectGrossPay(text: string): number | null {
  for (const re of GROSS_PATTERNS) {
    const m = text.match(re)
    if (m && m[1]) {
      const n = parseAmount(m[1])
      if (n !== null) return n
    }
  }
  return null
}

export function detectPayFrequency(text: string): PayFrequency | null {
  for (const [re, freq] of FREQUENCY_PATTERNS) {
    if (re.test(text)) return freq
  }
  return null
}

export function analyzeIncomeConsistency(opts: {
  statedMonthly: number
  payStubText: string | null
  documentId: string | null
}): IncomeAnalysisResult {
  const signals: SignalRow[] = []

  if (!opts.payStubText) {
    return { signals: [], observedMonthly: null, payFrequency: null }
  }

  const grossPerPeriod = detectGrossPay(opts.payStubText)
  const payFrequency = detectPayFrequency(opts.payStubText)

  if (grossPerPeriod === null || payFrequency === null) {
    return {
      signals: [],
      observedMonthly: null,
      payFrequency: payFrequency,
    }
  }

  const observedMonthly =
    grossPerPeriod * FREQUENCY_TO_MONTHLY_MULTIPLIER[payFrequency]

  const delta = opts.statedMonthly - observedMonthly
  const deltaPercent =
    opts.statedMonthly > 0 ? (delta / opts.statedMonthly) * 100 : 0

  if (Math.abs(deltaPercent) < 5) {
    return { signals, observedMonthly, payFrequency }
  }

  signals.push(
    incomeMathInconsistent({
      documentId: opts.documentId,
      statedMonthly: opts.statedMonthly,
      observedMonthly: Math.round(observedMonthly * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
      payFrequency,
    }),
  )

  return {
    signals,
    observedMonthly: Math.round(observedMonthly * 100) / 100,
    payFrequency,
  }
}
