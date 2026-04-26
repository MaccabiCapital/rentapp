// ============================================================
// Forensics engine — orchestrator
// ============================================================
//
// Loads a screening_reports row, fetches each linked
// application_documents file from storage, runs every check that
// has the inputs it needs, persists signals, computes risk_band,
// marks status complete or partial.
//
// Idempotent: a re-run deletes prior signals for the same report
// before inserting new ones.
//
// All AI is forbidden in this directory (CLAUDE.md hard rule #1).
// AI summaries live separately in app/lib/screening/ai-summary.ts.

import { getServiceRoleClient } from '@/lib/supabase/service-role'
import { downloadDocumentBytes } from '@/app/lib/storage/application-documents'
import { analyzePdfDocument } from './pdf-forensics'
import { analyzeIncomeConsistency } from './income-consistency'
import { extractPayStubText } from './text-extractors/pay-stub'
import { computeRiskBand } from './risk-band'
import type { SignalRow } from './signal-builders'
import type {
  ScreeningReportStatus,
  ScreeningRiskBand,
} from '@/app/lib/schemas/screening'

export type EngineRunResult = {
  reportId: string
  status: ScreeningReportStatus
  riskBand: ScreeningRiskBand | null
  signalCount: number
  documentsAnalyzed: number
  errors: string[]
}

// ------------------------------------------------------------
// Main entry point — runs the engine for a single report
// ------------------------------------------------------------

export async function runScreeningEngine(
  reportId: string,
): Promise<EngineRunResult> {
  const supabase = getServiceRoleClient()
  const errors: string[] = []

  // 1. Mark the report as running
  await supabase
    .from('screening_reports')
    .update({ status: 'running' })
    .eq('id', reportId)

  // 2. Load the report header (snapshots stated income, etc.)
  const { data: reportRow, error: rErr } = await supabase
    .from('screening_reports')
    .select('id, owner_id, prospect_id, stated_income_monthly')
    .eq('id', reportId)
    .maybeSingle()

  if (rErr || !reportRow) {
    await markError(reportId, rErr?.message ?? 'Report not found.')
    return {
      reportId,
      status: 'error',
      riskBand: null,
      signalCount: 0,
      documentsAnalyzed: 0,
      errors: [rErr?.message ?? 'Report not found.'],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = reportRow as any

  // 3. Load the prospect's documents
  const { data: docRows, error: dErr } = await supabase
    .from('application_documents')
    .select('id, kind, storage_path, mime_type')
    .eq('prospect_id', report.prospect_id)
    .is('deleted_at', null)

  if (dErr) {
    await markError(reportId, dErr.message)
    return {
      reportId,
      status: 'error',
      riskBand: null,
      signalCount: 0,
      documentsAnalyzed: 0,
      errors: [dErr.message],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documents = (docRows ?? []) as any[]

  // 4. Run checks on each document
  const allSignals: SignalRow[] = []
  let documentsAnalyzed = 0

  for (const doc of documents) {
    const bytes = await downloadDocumentBytes(doc.storage_path)
    if (!bytes) {
      errors.push(`Couldn't download ${doc.storage_path}`)
      continue
    }

    documentsAnalyzed += 1

    // PDF metadata forensics (any PDF)
    if (doc.mime_type === 'application/pdf') {
      const result = await analyzePdfDocument({
        documentId: doc.id,
        bytes,
      })
      allSignals.push(...result.signals)
    }

    // Income-consistency on pay stubs (text extraction is stubbed
    // in v1, so this typically returns no signals — wired up so
    // the moment a text extractor is added it just works).
    if (doc.kind === 'pay_stub' && report.stated_income_monthly) {
      const text =
        doc.mime_type === 'application/pdf'
          ? await extractPayStubText(bytes)
          : null

      const result = analyzeIncomeConsistency({
        statedMonthly: Number(report.stated_income_monthly),
        payStubText: text,
        documentId: doc.id,
      })
      allSignals.push(...result.signals)
    }
  }

  // 5. Replace any prior signals (idempotent re-run)
  await supabase
    .from('screening_signals')
    .delete()
    .eq('report_id', reportId)

  if (allSignals.length > 0) {
    const inserts = allSignals.map((s) => ({
      owner_id: report.owner_id,
      report_id: reportId,
      kind: s.kind,
      severity: s.severity,
      title: s.title,
      detail: s.detail,
      suggested_action: s.suggested_action,
      source_document_ids: s.source_document_ids,
      evidence_json: s.evidence_json,
    }))
    const { error: insErr } = await supabase
      .from('screening_signals')
      .insert(inserts)
    if (insErr) errors.push(`signals: ${insErr.message}`)
  }

  // 6. Compute risk band + final status
  const severities = allSignals.map((s) => s.severity)
  const riskBand = computeRiskBand(severities)

  // Status: 'partial' if no documents could be analyzed (the engine
  // ran but had nothing to look at). 'complete' otherwise.
  // 'error' is reserved for catastrophic failures earlier in the
  // function.
  const finalStatus: ScreeningReportStatus =
    documentsAnalyzed === 0 && documents.length > 0 ? 'partial' : 'complete'

  await supabase
    .from('screening_reports')
    .update({
      status: finalStatus,
      risk_band: riskBand,
    })
    .eq('id', reportId)

  // 7. Audit log entries
  await supabase.from('screening_audit_log').insert([
    {
      owner_id: report.owner_id,
      report_id: reportId,
      prospect_id: report.prospect_id,
      event: 'run_completed',
      event_data: {
        signal_count: allSignals.length,
        documents_analyzed: documentsAnalyzed,
        risk_band: riskBand,
        status: finalStatus,
        errors: errors.length > 0 ? errors : undefined,
      },
      actor_user_id: null,
      actor_kind: 'system',
    },
  ])

  return {
    reportId,
    status: finalStatus,
    riskBand,
    signalCount: allSignals.length,
    documentsAnalyzed,
    errors,
  }
}

async function markError(reportId: string, message: string): Promise<void> {
  const supabase = getServiceRoleClient()
  await supabase
    .from('screening_reports')
    .update({ status: 'error' })
    .eq('id', reportId)

  // Also log it
  const { data: row } = await supabase
    .from('screening_reports')
    .select('owner_id, prospect_id')
    .eq('id', reportId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any
  if (r) {
    await supabase.from('screening_audit_log').insert({
      owner_id: r.owner_id,
      report_id: reportId,
      prospect_id: r.prospect_id,
      event: 'run_failed',
      event_data: { error: message },
      actor_user_id: null,
      actor_kind: 'system',
    })
  }
}
