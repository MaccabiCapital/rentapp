// ============================================================
// Signal-row builders
// ============================================================
//
// Pure functions. Each builder takes structured evidence and
// returns the row to insert. The plain-English titles + details
// are centralized here so they're not scattered across the engine.

import type {
  ScreeningSignalKind,
  ScreeningSignalSeverity,
} from '@/app/lib/schemas/screening'

export type SignalRow = {
  kind: ScreeningSignalKind
  severity: ScreeningSignalSeverity
  title: string
  detail: string
  suggested_action: string | null
  source_document_ids: string[]
  evidence_json: Record<string, unknown> | null
}

// ------------------------------------------------------------
// PDF metadata anomaly
// ------------------------------------------------------------

export function pdfMetadataAnomaly(opts: {
  documentId: string
  producer: string | null
  creator: string | null
  modDate: string | null
  createDate: string | null
  modCreateGapMs: number | null // null = unknown
}): SignalRow {
  const lines: string[] = []
  if (opts.producer) lines.push(`PDF Producer: "${opts.producer}"`)
  if (opts.creator) lines.push(`PDF Creator: "${opts.creator}"`)
  if (opts.createDate)
    lines.push(`Original creation: ${opts.createDate}`)
  if (opts.modDate)
    lines.push(`Last modified: ${opts.modDate}`)
  if (opts.modCreateGapMs !== null && opts.modCreateGapMs > 0) {
    const minutes = Math.round(opts.modCreateGapMs / 60000)
    lines.push(`Modified ${minutes} minute(s) after creation`)
  }

  // Severity: photo-editor producers (Photoshop, GIMP) on a pay
  // stub are a strong red. Generic editors (Word, generic PDF
  // libs) producing a recently-modified file are amber.
  const isPhotoEditor =
    !!opts.producer &&
    /(photoshop|gimp|illustrator|preview \(macos\)|inkscape|pixelmator)/i.test(
      opts.producer,
    )
  const severity: ScreeningSignalSeverity = isPhotoEditor ? 'red' : 'amber'

  return {
    kind: 'pdf_metadata_anomaly',
    severity,
    title: isPhotoEditor
      ? 'Pay stub appears to have been edited in a photo editor'
      : 'PDF was modified after it was created',
    detail: lines.join('. '),
    suggested_action: isPhotoEditor
      ? 'Ask the applicant for a fresh copy direct from their employer or payroll provider (e.g., ADP, Gusto, Paychex). Compare the Producer field on a known-good stub.'
      : 'Open the document and look for visual cues that something was changed — overlapping text, mismatched fonts, blurred regions. Ask for the original file from the source if anything looks off.',
    source_document_ids: [opts.documentId],
    evidence_json: {
      producer: opts.producer,
      creator: opts.creator,
      mod_date: opts.modDate,
      create_date: opts.createDate,
      mod_create_gap_ms: opts.modCreateGapMs,
    },
  }
}

// ------------------------------------------------------------
// Income math inconsistent
// ------------------------------------------------------------

export function incomeMathInconsistent(opts: {
  documentId: string | null
  statedMonthly: number
  observedMonthly: number
  delta: number
  deltaPercent: number
  payFrequency: string | null
}): SignalRow {
  const isLargeDelta = Math.abs(opts.deltaPercent) >= 15
  const severity: ScreeningSignalSeverity = isLargeDelta ? 'red' : 'amber'

  const directionWord = opts.delta > 0 ? 'less' : 'more'
  const observedAbs = Math.abs(opts.delta)
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(n)

  return {
    kind: 'income_math_inconsistent',
    severity,
    title: isLargeDelta
      ? `Stated income is ${Math.abs(Math.round(opts.deltaPercent))}% off from pay stub`
      : `Stated income doesn't match pay stub`,
    detail: `Applicant stated ${fmt(opts.statedMonthly)}/mo. Pay stub${opts.payFrequency ? ` (${opts.payFrequency})` : ''} works out to about ${fmt(opts.observedMonthly)}/mo — ${fmt(observedAbs)} ${directionWord} than stated.`,
    suggested_action:
      'Ask for a second pay stub or a year-to-date earnings summary. If self-employed, ask for tax returns. If income is variable, ask for an average over a 3-6 month window.',
    source_document_ids: opts.documentId ? [opts.documentId] : [],
    evidence_json: {
      stated_monthly: opts.statedMonthly,
      observed_monthly: opts.observedMonthly,
      delta: opts.delta,
      delta_percent: opts.deltaPercent,
      pay_frequency: opts.payFrequency,
    },
  }
}

// ------------------------------------------------------------
// Pay frequency mismatch (stated frequency vs detected frequency)
// ------------------------------------------------------------

export function payFrequencyMismatch(opts: {
  documentId: string
  statedFrequency: string
  detectedFrequency: string
}): SignalRow {
  return {
    kind: 'pay_frequency_mismatch',
    severity: 'amber',
    title: 'Pay frequency on the stub differs from what was stated',
    detail: `Applicant stated ${opts.statedFrequency} pay; the stub shows ${opts.detectedFrequency}. This often means the income calculation is wrong, not that the pay is fake.`,
    suggested_action:
      'Confirm the actual pay frequency with the applicant and recalculate monthly income at that frequency.',
    source_document_ids: [opts.documentId],
    evidence_json: {
      stated_frequency: opts.statedFrequency,
      detected_frequency: opts.detectedFrequency,
    },
  }
}

// ------------------------------------------------------------
// Green confirmation signal — useful for showing positive verifications
// ------------------------------------------------------------

export function genericGreen(opts: {
  kind: ScreeningSignalKind
  title: string
  detail: string
  source_document_ids?: string[]
  evidence_json?: Record<string, unknown>
}): SignalRow {
  return {
    kind: opts.kind,
    severity: 'green',
    title: opts.title,
    detail: opts.detail,
    suggested_action: null,
    source_document_ids: opts.source_document_ids ?? [],
    evidence_json: opts.evidence_json ?? null,
  }
}
