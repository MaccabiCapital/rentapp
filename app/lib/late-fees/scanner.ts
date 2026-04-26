// ============================================================
// Late fee auto-scan engine
// ============================================================
//
// Finds rent_schedules that are overdue past the lease's grace
// period, checks the state cap, and applies a late fee charge if
// none exists for today yet.
//
// Idempotent: the unique partial index
// (rent_schedule_id, applied_on) WHERE source = 'auto_scan'
// prevents duplicate fees if the scan runs multiple times in a day.
//
// Used by:
//   - /api/cron/late-fees daily Vercel cron
//   - "Run scan now" button in the dashboard
//
// All queries use the service-role client because the cron has no
// authenticated user. The scanner explicitly carries owner_id
// through every insert so RLS-compatible reads still work.

import { getServiceRoleClient } from '@/lib/supabase/service-role'

export type ScanResult = {
  scannedAt: string
  scheduleScanned: number
  feesApplied: number
  feesSkippedBelowState: number
  feesSkippedNoConfig: number
  feesSkippedAlreadyApplied: number
  feesSkippedPaidInFull: number
  totalAmountApplied: number
  errors: string[]
}

type RentScheduleRow = {
  id: string
  owner_id: string
  lease_id: string
  due_date: string
  amount: number
  paid_amount: number
  status: string
}

type LeaseConfigRow = {
  id: string
  late_fee_amount: number | null
  late_fee_grace_days: number | null
  monthly_rent: number
  unit: { property: { state: string | null } | null } | null
}

type StateRule = {
  state: string
  late_fee_max_percent: number | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime()
  const b = new Date(toIso + 'T00:00:00Z').getTime()
  return Math.floor((b - a) / (1000 * 60 * 60 * 24))
}

function capByState(
  proposedAmount: number,
  monthlyRent: number,
  stateMaxPercent: number | null,
): number {
  if (stateMaxPercent === null || !Number.isFinite(stateMaxPercent)) {
    return proposedAmount
  }
  const cap = (monthlyRent * stateMaxPercent) / 100
  return Math.min(proposedAmount, cap)
}

// ------------------------------------------------------------
// Main scan
// ------------------------------------------------------------

export async function scanAndApplyLateFees(opts?: {
  ownerId?: string // restrict to a single landlord (used by manual button)
}): Promise<ScanResult> {
  const supabase = getServiceRoleClient()
  const today = todayIso()

  const result: ScanResult = {
    scannedAt: new Date().toISOString(),
    scheduleScanned: 0,
    feesApplied: 0,
    feesSkippedBelowState: 0,
    feesSkippedNoConfig: 0,
    feesSkippedAlreadyApplied: 0,
    feesSkippedPaidInFull: 0,
    totalAmountApplied: 0,
    errors: [],
  }

  // 1. Pull all rent schedules whose due_date is in the past and
  // whose paid_amount < amount. These are candidates.
  let scheduleQuery = supabase
    .from('rent_schedules')
    .select('id, owner_id, lease_id, due_date, amount, paid_amount, status')
    .lte('due_date', today)
    .is('deleted_at', null)

  if (opts?.ownerId) {
    scheduleQuery = scheduleQuery.eq('owner_id', opts.ownerId)
  }

  const { data: scheduleRows, error: schedErr } = await scheduleQuery

  if (schedErr) {
    result.errors.push(`schedules: ${schedErr.message}`)
    return result
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = ((scheduleRows ?? []) as any[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    paid_amount: Number(r.paid_amount),
  })) as RentScheduleRow[]

  // Filter to truly unpaid + overdue
  const overdueCandidates = candidates.filter(
    (s) => s.paid_amount < s.amount,
  )

  result.scheduleScanned = overdueCandidates.length

  if (overdueCandidates.length === 0) {
    return result
  }

  // 2. Pull lease configs for all candidate leases in one query
  const leaseIds = Array.from(new Set(overdueCandidates.map((s) => s.lease_id)))
  const { data: leaseRows, error: leaseErr } = await supabase
    .from('leases')
    .select(
      `id, late_fee_amount, late_fee_grace_days, monthly_rent,
       unit:units ( property:properties ( state ) )`,
    )
    .in('id', leaseIds)
    .is('deleted_at', null)

  if (leaseErr) {
    result.errors.push(`leases: ${leaseErr.message}`)
    return result
  }

  const leaseMap = new Map<string, LeaseConfigRow>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leaseRows ?? []) as any[]) {
    leaseMap.set(l.id, {
      id: l.id,
      late_fee_amount:
        l.late_fee_amount === null ? null : Number(l.late_fee_amount),
      late_fee_grace_days:
        l.late_fee_grace_days === null ? null : Number(l.late_fee_grace_days),
      monthly_rent: Number(l.monthly_rent),
      unit: l.unit ?? null,
    })
  }

  // 3. Pull state rules for all referenced states in one query
  const states = Array.from(
    new Set(
      Array.from(leaseMap.values())
        .map((l) => l.unit?.property?.state ?? null)
        .filter((s): s is string => !!s),
    ),
  )
  const stateRuleMap = new Map<string, StateRule>()
  if (states.length > 0) {
    const { data: ruleRows } = await supabase
      .from('state_rent_rules')
      .select('state, late_fee_max_percent')
      .in('state', states)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (ruleRows ?? []) as any[]) {
      stateRuleMap.set(r.state, {
        state: r.state,
        late_fee_max_percent:
          r.late_fee_max_percent === null
            ? null
            : Number(r.late_fee_max_percent),
      })
    }
  }

  // 4. Pull existing auto-scan fees applied today, to skip duplicates
  // (the unique index will catch this, but we want to track the
  // skip count in the summary).
  const { data: existingTodayRows } = await supabase
    .from('late_fee_charges')
    .select('rent_schedule_id')
    .eq('applied_on', today)
    .eq('source', 'auto_scan')
    .is('deleted_at', null)
  const alreadyAppliedSet = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((existingTodayRows ?? []) as any[]).map((r) => r.rent_schedule_id),
  )

  // 5. Build inserts
  const inserts: Array<{
    owner_id: string
    lease_id: string
    rent_schedule_id: string
    amount: number
    source: 'auto_scan'
    state_max_percent: number | null
    notes: string | null
  }> = []

  for (const sched of overdueCandidates) {
    const lease = leaseMap.get(sched.lease_id)
    if (!lease) {
      result.feesSkippedNoConfig += 1
      continue
    }
    if (
      lease.late_fee_amount === null ||
      lease.late_fee_amount <= 0 ||
      lease.late_fee_grace_days === null
    ) {
      result.feesSkippedNoConfig += 1
      continue
    }

    const daysLate = daysBetween(sched.due_date, today)
    if (daysLate < lease.late_fee_grace_days) {
      // still in grace period
      continue
    }

    if (alreadyAppliedSet.has(sched.id)) {
      result.feesSkippedAlreadyApplied += 1
      continue
    }

    if (sched.paid_amount >= sched.amount) {
      result.feesSkippedPaidInFull += 1
      continue
    }

    const stateCode = lease.unit?.property?.state ?? null
    const stateRule = stateCode ? (stateRuleMap.get(stateCode) ?? null) : null

    const cappedAmount = capByState(
      lease.late_fee_amount,
      lease.monthly_rent,
      stateRule?.late_fee_max_percent ?? null,
    )

    if (cappedAmount < lease.late_fee_amount) {
      // The configured fee was reduced by the state cap. We still
      // apply the capped amount — count it both as an apply and as
      // "below state" for transparency in the summary.
      result.feesSkippedBelowState += 1
    }

    if (cappedAmount <= 0) continue

    inserts.push({
      owner_id: sched.owner_id,
      lease_id: sched.lease_id,
      rent_schedule_id: sched.id,
      amount: Math.round(cappedAmount * 100) / 100,
      source: 'auto_scan',
      state_max_percent: stateRule?.late_fee_max_percent ?? null,
      notes: null,
    })
  }

  if (inserts.length > 0) {
    const { error: insErr, data: inserted } = await supabase
      .from('late_fee_charges')
      .insert(inserts)
      .select('id, amount')

    if (insErr) {
      // The unique index could trip if a parallel run inserted same-day.
      // In that case some rows still went in; we don't have a clean way
      // to distinguish, so just log and continue.
      result.errors.push(`insert: ${insErr.message}`)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (inserted ?? []) as any[]
      result.feesApplied = rows.length
      result.totalAmountApplied =
        Math.round(rows.reduce((sum, r) => sum + Number(r.amount), 0) * 100) /
        100
    }
  }

  // 6. Telemetry — record the scan on landlord_settings (per-owner
  // rows). For per-owner manual scans we have ownerId; for the
  // global cron we update every owner's row.
  const ownerIdsTouched = Array.from(
    new Set(overdueCandidates.map((s) => s.owner_id)),
  )
  if (ownerIdsTouched.length > 0) {
    const summary = {
      scannedAt: result.scannedAt,
      feesApplied: result.feesApplied,
      totalAmountApplied: result.totalAmountApplied,
      scheduleScanned: result.scheduleScanned,
    }
    for (const ownerId of ownerIdsTouched) {
      // landlord_settings rows might not exist yet; upsert.
      await supabase
        .from('landlord_settings')
        .upsert(
          {
            owner_id: ownerId,
            last_late_fee_scan_at: result.scannedAt,
            last_late_fee_scan_summary: summary,
          },
          { onConflict: 'owner_id' },
        )
    }
  }

  return result
}
