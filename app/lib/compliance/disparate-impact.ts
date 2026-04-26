// ============================================================
// Disparate-impact engine
// ============================================================
//
// HARD RULE (FAIRSCREEN-SPEC §1, codified in CLAUDE.md):
// This engine MUST NOT read name, email, phone, address, or any
// proxy that could correlate with a protected class. It computes
// approval-rate-by-cohort using non-PII signals only.
//
// Cohort dimensions (v1 — extends as more signal data lands):
//   1. Income band — tertiles by stated_income_monthly
//   2. Risk band — green / amber / red from Proof Check
//   3. Application order — first-week-of-month vs later
//
// Threshold: a cohort whose approval rate diverges from the
// cross-cohort baseline by >20 percentage points raises a finding.
// (The 20-point figure is configurable per FAIRSCREEN-SPEC §2.5.)
//
// Founder-Q-answered minimum: 10 decisions in 90 days before the
// engine runs at all.

import { getServiceRoleClient } from '@/lib/supabase/service-role'

const MIN_DECISIONS_TO_RUN = 10
const WINDOW_DAYS = 90
const DIVERGENCE_THRESHOLD_POINTS = 20

type DecisionRow = {
  owner_id: string
  prospect_id: string
  landlord_decision: string | null
  stated_income_monthly: number | null
  risk_band: string | null
  created_at: string
}

export type CohortStat = {
  dimension: string
  bucket: string
  total: number
  approvals: number
  rejections: number
  more_info: number
  approval_rate: number
}

export type DisparateImpactRunResult = {
  ownerId: string
  windowStart: string
  windowEnd: string
  decisionsTotal: number
  approvals: number
  rejections: number
  moreInfo: number
  cohortStats: CohortStat[]
  flaggedCohorts: CohortStat[]
  status: 'complete' | 'partial' | 'error'
  error?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function tertileOf(value: number, sortedValues: number[]): 'low' | 'mid' | 'high' {
  // sortedValues must be sorted ascending and excluded of nulls
  if (sortedValues.length === 0) return 'mid'
  const lowCutoff = sortedValues[Math.floor(sortedValues.length / 3)]
  const highCutoff = sortedValues[Math.floor((2 * sortedValues.length) / 3)]
  if (value <= lowCutoff) return 'low'
  if (value >= highCutoff) return 'high'
  return 'mid'
}

function dayOfMonthBucket(iso: string): 'first_week' | 'rest_of_month' {
  const d = new Date(iso)
  return d.getUTCDate() <= 7 ? 'first_week' : 'rest_of_month'
}

function bucketStats(
  rows: DecisionRow[],
  bucketKey: (r: DecisionRow) => string | null,
  dimension: string,
): CohortStat[] {
  const buckets = new Map<string, DecisionRow[]>()
  for (const r of rows) {
    const k = bucketKey(r)
    if (k === null) continue
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(r)
  }
  const stats: CohortStat[] = []
  for (const [bucket, rs] of buckets.entries()) {
    const total = rs.length
    const approvals = rs.filter((r) => r.landlord_decision === 'approved').length
    const rejections = rs.filter((r) => r.landlord_decision === 'rejected').length
    const moreInfo = rs.filter(
      (r) => r.landlord_decision === 'requested_more_info',
    ).length
    const approvalRate = total > 0 ? approvals / total : 0
    stats.push({
      dimension,
      bucket,
      total,
      approvals,
      rejections,
      more_info: moreInfo,
      approval_rate: Math.round(approvalRate * 1000) / 10, // percent, 1 decimal
    })
  }
  return stats
}

// ------------------------------------------------------------
// Main entry
// ------------------------------------------------------------

export async function runDisparateImpactForOwner(
  ownerId: string,
): Promise<DisparateImpactRunResult> {
  const supabase = getServiceRoleClient()
  const windowEnd = todayIso()
  const windowStart = daysAgoIso(WINDOW_DAYS)

  // 1. Pull non-PII decision rows in window. Critically: NO name,
  // email, phone, address, or any proxy thereof.
  const { data, error } = await supabase
    .from('screening_reports')
    .select(
      'owner_id, prospect_id, landlord_decision, stated_income_monthly, risk_band, created_at',
    )
    .eq('owner_id', ownerId)
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd + 'T23:59:59Z')
    .is('deleted_at', null)
    .not('landlord_decision', 'is', null)

  if (error) {
    return {
      ownerId,
      windowStart,
      windowEnd,
      decisionsTotal: 0,
      approvals: 0,
      rejections: 0,
      moreInfo: 0,
      cohortStats: [],
      flaggedCohorts: [],
      status: 'error',
      error: error.message,
    }
  }

  const rows = ((data ?? []) as DecisionRow[]).map((r) => ({
    ...r,
    stated_income_monthly:
      r.stated_income_monthly === null ? null : Number(r.stated_income_monthly),
  }))

  if (rows.length < MIN_DECISIONS_TO_RUN) {
    // Not enough data for meaningful cohort analysis. Record a
    // partial run so the UI can show "needs more data".
    return {
      ownerId,
      windowStart,
      windowEnd,
      decisionsTotal: rows.length,
      approvals: rows.filter((r) => r.landlord_decision === 'approved').length,
      rejections: rows.filter((r) => r.landlord_decision === 'rejected').length,
      moreInfo: rows.filter((r) => r.landlord_decision === 'requested_more_info')
        .length,
      cohortStats: [],
      flaggedCohorts: [],
      status: 'partial',
    }
  }

  // 2. Cohort dimension: income tertile
  const sortedIncomes = rows
    .map((r) => r.stated_income_monthly)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)

  const incomeStats = bucketStats(
    rows,
    (r) =>
      r.stated_income_monthly !== null
        ? tertileOf(r.stated_income_monthly, sortedIncomes)
        : null,
    'income_band',
  )

  // 3. Cohort dimension: risk band (from Proof Check)
  const riskStats = bucketStats(
    rows,
    (r) => r.risk_band ?? null,
    'risk_band',
  )

  // 4. Cohort dimension: application timing
  const timingStats = bucketStats(
    rows,
    (r) => dayOfMonthBucket(r.created_at),
    'application_timing',
  )

  const allStats = [...incomeStats, ...riskStats, ...timingStats]

  // 5. Flag any cohort whose approval rate diverges from baseline
  // by more than the threshold.
  const totalApprovals = rows.filter((r) => r.landlord_decision === 'approved')
    .length
  const baselineRate = (totalApprovals / rows.length) * 100

  const flagged = allStats.filter(
    (s) => Math.abs(s.approval_rate - baselineRate) > DIVERGENCE_THRESHOLD_POINTS,
  )

  return {
    ownerId,
    windowStart,
    windowEnd,
    decisionsTotal: rows.length,
    approvals: totalApprovals,
    rejections: rows.filter((r) => r.landlord_decision === 'rejected').length,
    moreInfo: rows.filter((r) => r.landlord_decision === 'requested_more_info')
      .length,
    cohortStats: allStats,
    flaggedCohorts: flagged,
    status: 'complete',
  }
}

// ------------------------------------------------------------
// Persistence
// ------------------------------------------------------------

export async function persistRunResult(
  result: DisparateImpactRunResult,
): Promise<{ runId: string }> {
  const supabase = getServiceRoleClient()

  const { data: run, error } = await supabase
    .from('disparate_impact_runs')
    .insert({
      owner_id: result.ownerId,
      status: result.status,
      window_start: result.windowStart,
      window_end: result.windowEnd,
      decisions_total: result.decisionsTotal,
      approvals: result.approvals,
      rejections: result.rejections,
      more_info_requests: result.moreInfo,
      cohort_breakdowns: { stats: result.cohortStats },
      findings_red: result.flaggedCohorts.length,
      findings_amber: 0,
      error_text: result.error ?? null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !run) {
    throw new Error(error?.message ?? 'Failed to record DI run.')
  }

  // Per-cohort findings inserted into compliance_findings
  if (result.flaggedCohorts.length > 0) {
    const baselineRate =
      (result.approvals / Math.max(result.decisionsTotal, 1)) * 100
    const inserts = result.flaggedCohorts.map((c) => ({
      owner_id: result.ownerId,
      source: 'disparate_impact' as const,
      severity: 'red' as const,
      status: 'open' as const,
      subject_di_run_id: run.id,
      title: `Cohort divergence — ${c.dimension}: ${c.bucket}`,
      detail: `Approval rate for the ${c.bucket} cohort (${c.dimension}) is ${c.approval_rate}% vs the cross-cohort baseline of ${Math.round(baselineRate * 10) / 10}%. Investigate whether the divergence reflects a legitimate non-protected-class basis.`,
      suggested_fix:
        'Compare the rejected applicants in this cohort against your tenant selection criteria. Document the rejection reason in legally-allowed terms (income / credit / eviction history). If the pattern persists, consult a fair-housing attorney.',
      jurisdiction: 'US',
      rule_id: `di.${c.dimension}.${c.bucket}`,
      evidence_json: { cohort: c, baseline_rate: baselineRate },
    }))
    await supabase.from('compliance_findings').insert(inserts)
  }

  await supabase.from('compliance_audit_log').insert({
    owner_id: result.ownerId,
    di_run_id: run.id,
    event:
      result.status === 'complete'
        ? 'di_run_completed'
        : result.status === 'partial'
          ? 'di_run_partial'
          : 'di_run_failed',
    event_data: {
      decisions_total: result.decisionsTotal,
      flagged_count: result.flaggedCohorts.length,
      error: result.error ?? null,
    },
    actor_user_id: null,
    actor_kind: 'system',
  })

  return { runId: run.id }
}

// ------------------------------------------------------------
// Cron entry — runs for every active landlord
// ------------------------------------------------------------

export async function runDisparateImpactForAll(): Promise<{
  ownersScanned: number
  ownersRun: number
  ownersSkipped: number
}> {
  const supabase = getServiceRoleClient()

  // Active landlords = those with any screening_reports activity in
  // the window. Cheaper than enumerating all landlord_settings rows.
  const { data, error } = await supabase
    .from('screening_reports')
    .select('owner_id')
    .gte('created_at', daysAgoIso(WINDOW_DAYS))
    .is('deleted_at', null)

  if (error) {
    return { ownersScanned: 0, ownersRun: 0, ownersSkipped: 0 }
  }

  const ownerSet = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((data ?? []) as any[]).map((r) => r.owner_id as string),
  )

  let ownersRun = 0
  let ownersSkipped = 0
  for (const ownerId of ownerSet) {
    const result = await runDisparateImpactForOwner(ownerId)
    if (result.status === 'partial' || result.decisionsTotal === 0) {
      ownersSkipped += 1
      // Still persist the partial run so the dashboard can show
      // "no data yet" cleanly. Skip the per-cohort findings.
      await persistRunResult(result)
    } else {
      await persistRunResult(result)
      ownersRun += 1
    }
  }

  return {
    ownersScanned: ownerSet.size,
    ownersRun,
    ownersSkipped,
  }
}
