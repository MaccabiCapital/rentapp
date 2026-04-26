// ============================================================
// Proof Check (screening) read queries
// ============================================================
//
// All RLS-scoped to the landlord. Tenants do not read screening
// data — they only contribute uploads via the public-application
// action.

import { createServerClient } from '@/lib/supabase/server'
import type {
  ApplicationDocument,
  ScreeningReport,
  ScreeningReportWithSignals,
  ScreeningSignal,
  ScreeningAuditLogEntry,
} from '@/app/lib/schemas/screening'

// ------------------------------------------------------------
// Single report (with signals joined)
// ------------------------------------------------------------

export async function getScreeningReport(
  reportId: string,
): Promise<ScreeningReportWithSignals | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screening_reports')
    .select(`*, signals:screening_signals(*)`)
    .eq('id', reportId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  const signals = ((row.signals ?? []) as ScreeningSignal[]).slice().sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signals: _signals, ...rest } = row
  return {
    ...rest,
    stated_income_monthly:
      row.stated_income_monthly === null
        ? null
        : Number(row.stated_income_monthly),
    signals,
  } as ScreeningReportWithSignals
}

// ------------------------------------------------------------
// Latest report per prospect
// ------------------------------------------------------------

export async function getLatestScreeningReportForProspect(
  prospectId: string,
): Promise<ScreeningReport | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screening_reports')
    .select('*')
    .eq('prospect_id', prospectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    ...r,
    stated_income_monthly:
      r.stated_income_monthly === null ? null : Number(r.stated_income_monthly),
  } as ScreeningReport
}

// ------------------------------------------------------------
// All reports for a prospect (newest first)
// ------------------------------------------------------------

export async function listScreeningReportsForProspect(
  prospectId: string,
): Promise<ScreeningReport[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screening_reports')
    .select('*')
    .eq('prospect_id', prospectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    stated_income_monthly:
      r.stated_income_monthly === null ? null : Number(r.stated_income_monthly),
  })) as ScreeningReport[]
}

// ------------------------------------------------------------
// Signals for a report
// ------------------------------------------------------------

export async function listScreeningSignals(
  reportId: string,
): Promise<ScreeningSignal[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screening_signals')
    .select('*')
    .eq('report_id', reportId)
    .order('severity', { ascending: false })

  if (error) throw error
  return (data ?? []) as ScreeningSignal[]
}

// ------------------------------------------------------------
// Documents for a prospect
// ------------------------------------------------------------

export async function listApplicationDocuments(
  prospectId: string,
): Promise<ApplicationDocument[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('application_documents')
    .select('*')
    .eq('prospect_id', prospectId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ApplicationDocument[]
}

// ------------------------------------------------------------
// Audit log
// ------------------------------------------------------------

export async function getScreeningAuditLog(opts?: {
  prospectId?: string
  reportId?: string
  limit?: number
}): Promise<ScreeningAuditLogEntry[]> {
  const supabase = await createServerClient()
  let query = supabase
    .from('screening_audit_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts?.prospectId) query = query.eq('prospect_id', opts.prospectId)
  if (opts?.reportId) query = query.eq('report_id', opts.reportId)
  query = query.limit(opts?.limit ?? 100)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ScreeningAuditLogEntry[]
}

// ------------------------------------------------------------
// Dashboard count: prospects with a complete report awaiting decision
// ------------------------------------------------------------

export async function countProspectsAwaitingScreeningReview(): Promise<number> {
  const supabase = await createServerClient()
  const { count, error } = await supabase
    .from('screening_reports')
    .select('id', { count: 'exact', head: true })
    .in('status', ['complete', 'partial'])
    .in('risk_band', ['amber', 'red'])
    .is('landlord_decision', null)
    .is('deleted_at', null)

  if (error) return 0
  return count ?? 0
}

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------

function severityRank(s: 'green' | 'amber' | 'red'): number {
  // higher (worse) severity sorts first
  if (s === 'red') return 0
  if (s === 'amber') return 1
  return 2
}
