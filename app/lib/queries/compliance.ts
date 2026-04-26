// ============================================================
// FairScreen (compliance) read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type {
  StateFairHousingRule,
  ComplianceFinding,
  ComplianceAuditLogEntry,
  FhFindingStatus,
  FhFindingSource,
  FhFindingSeverity,
} from '@/app/lib/schemas/compliance'

// ------------------------------------------------------------
// State fair-housing rules — global reference
// ------------------------------------------------------------

export async function getStateFairHousingRule(
  jurisdiction: string,
): Promise<StateFairHousingRule | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_fair_housing_rules')
    .select('*')
    .eq('jurisdiction', jurisdiction.toUpperCase())
    .maybeSingle()
  if (error || !data) return null
  return data as StateFairHousingRule
}

export async function listStateFairHousingRules(): Promise<
  StateFairHousingRule[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_fair_housing_rules')
    .select('*')
    .order('jurisdiction', { ascending: true })
  if (error) throw error
  return (data ?? []) as StateFairHousingRule[]
}

// ------------------------------------------------------------
// Findings inbox
// ------------------------------------------------------------

export async function listFindings(opts?: {
  status?: FhFindingStatus
  source?: FhFindingSource
  severity?: FhFindingSeverity
  subjectListingId?: string
  subjectCriteriaId?: string
  limit?: number
}): Promise<ComplianceFinding[]> {
  const supabase = await createServerClient()
  let q = supabase
    .from('compliance_findings')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.source) q = q.eq('source', opts.source)
  if (opts?.severity) q = q.eq('severity', opts.severity)
  if (opts?.subjectListingId)
    q = q.eq('subject_listing_id', opts.subjectListingId)
  if (opts?.subjectCriteriaId)
    q = q.eq('subject_criteria_id', opts.subjectCriteriaId)
  q = q.limit(opts?.limit ?? 100)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ComplianceFinding[]
}

export async function getFinding(
  id: string,
): Promise<ComplianceFinding | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('compliance_findings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as ComplianceFinding
}

export async function countOpenFindings(): Promise<number> {
  const supabase = await createServerClient()
  const { count, error } = await supabase
    .from('compliance_findings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
  if (error) return 0
  return count ?? 0
}

export async function countOpenFindingsBySeverity(): Promise<
  Record<FhFindingSeverity, number>
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('compliance_findings')
    .select('severity')
    .eq('status', 'open')
  const out: Record<FhFindingSeverity, number> = { info: 0, amber: 0, red: 0 }
  if (error) return out
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    if (r.severity in out) out[r.severity as FhFindingSeverity] += 1
  }
  return out
}

// ------------------------------------------------------------
// Audit log
// ------------------------------------------------------------

export async function getComplianceAuditLog(opts?: {
  findingId?: string
  criteriaId?: string
  diRunId?: string
  limit?: number
}): Promise<ComplianceAuditLogEntry[]> {
  const supabase = await createServerClient()
  let q = supabase
    .from('compliance_audit_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts?.findingId) q = q.eq('finding_id', opts.findingId)
  if (opts?.criteriaId) q = q.eq('criteria_id', opts.criteriaId)
  if (opts?.diRunId) q = q.eq('di_run_id', opts.diRunId)
  q = q.limit(opts?.limit ?? 100)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ComplianceAuditLogEntry[]
}
