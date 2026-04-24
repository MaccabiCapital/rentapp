// ============================================================
// Reporting / analytics queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'

export type PortfolioReport = {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  noticeGivenUnits: number
  monthlyRentPotential: number
  monthlyRentInEffect: number
  occupancyPct: number
}

export async function getPortfolioReport(): Promise<PortfolioReport> {
  const supabase = await createServerClient()
  const [unitsRes, propsRes, leasesRes] = await Promise.all([
    supabase
      .from('units')
      .select('id, status, monthly_rent')
      .is('deleted_at', null),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('leases')
      .select('id, unit_id, monthly_rent, status')
      .is('deleted_at', null)
      .eq('status', 'active'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const units = (unitsRes.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leases = (leasesRes.data ?? []) as any[]

  const activeRentByUnit = new Map<string, number>()
  for (const l of leases) {
    activeRentByUnit.set(l.unit_id, Number(l.monthly_rent))
  }

  let totalUnits = 0
  let occupied = 0
  let vacant = 0
  let noticeGiven = 0
  let potential = 0
  let inEffect = 0
  for (const u of units) {
    totalUnits += 1
    if (u.status === 'occupied') occupied += 1
    else if (u.status === 'vacant') vacant += 1
    else if (u.status === 'notice_given') noticeGiven += 1
    if (u.monthly_rent !== null && u.monthly_rent !== undefined) {
      potential += Number(u.monthly_rent)
    }
    const active = activeRentByUnit.get(u.id)
    if (active !== undefined) inEffect += active
  }

  return {
    totalProperties: propsRes.count ?? 0,
    totalUnits,
    occupiedUnits: occupied,
    vacantUnits: vacant,
    noticeGivenUnits: noticeGiven,
    monthlyRentPotential: potential,
    monthlyRentInEffect: inEffect,
    occupancyPct: totalUnits === 0 ? 0 : (occupied / totalUnits) * 100,
  }
}

export type RentReport = {
  paidThisMonth: number
  paidYtd: number
  outstandingNow: number
  overdueCount: number
  lateFeeYtd: number
  collectionRatePct: number
}

export async function getRentReport(): Promise<RentReport> {
  const supabase = await createServerClient()
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const todayIso = new Date().toISOString().slice(0, 10)

  const { data: schedules } = await supabase
    .from('rent_schedules')
    .select('amount, paid_amount, status, due_date')
    .is('deleted_at', null)
    .gte('due_date', yearStart)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (schedules ?? []) as any[]
  let paidYtd = 0
  let paidMonth = 0
  let owedYtd = 0
  let outstandingNow = 0
  let overdueCount = 0
  let lateFeeYtd = 0
  for (const r of rows) {
    const amt = Number(r.amount)
    const paid = Number(r.paid_amount ?? 0)
    owedYtd += amt
    paidYtd += paid
    if (r.due_date >= monthStart && r.due_date <= todayIso) {
      paidMonth += paid
    }
    if (
      r.status === 'due' ||
      r.status === 'overdue' ||
      r.status === 'partial' ||
      r.status === 'upcoming'
    ) {
      if (r.due_date < todayIso) {
        outstandingNow += amt - paid
        overdueCount += 1
      }
    }
  }

  const { data: paymentsLate } = await supabase
    .from('payments')
    .select('late_fee_applied, paid_at')
    .not('late_fee_applied', 'is', null)
    .gte('paid_at', `${year}-01-01T00:00:00Z`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (paymentsLate ?? []) as any[]) {
    lateFeeYtd += Number(p.late_fee_applied ?? 0)
  }

  return {
    paidThisMonth: paidMonth,
    paidYtd,
    outstandingNow,
    overdueCount,
    lateFeeYtd,
    collectionRatePct: owedYtd === 0 ? 0 : (paidYtd / owedYtd) * 100,
  }
}

export type MaintenanceReport = {
  openCount: number
  inProgressCount: number
  resolvedThisMonth: number
  avgDaysToResolve: number | null
  byUrgency: Array<{ urgency: string; count: number }>
}

export async function getMaintenanceReport(): Promise<MaintenanceReport> {
  const supabase = await createServerClient()
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'

  const { data } = await supabase
    .from('maintenance_requests')
    .select('status, urgency, created_at, resolved_at')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]

  let openCount = 0
  let inProgressCount = 0
  let resolvedMonth = 0
  const resolutionDays: number[] = []
  const byUrg: Record<string, number> = {}

  for (const r of rows) {
    if (r.status === 'open' || r.status === 'assigned' || r.status === 'awaiting_parts') {
      openCount += 1
    } else if (r.status === 'in_progress') {
      inProgressCount += 1
    } else if (r.status === 'resolved' || r.status === 'closed') {
      if (r.resolved_at && r.resolved_at >= `${monthStart}T00:00:00Z`) {
        resolvedMonth += 1
      }
      if (r.resolved_at && r.created_at) {
        const days =
          (new Date(r.resolved_at).getTime() -
            new Date(r.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
        if (days >= 0) resolutionDays.push(days)
      }
    }
    if (r.status !== 'resolved' && r.status !== 'closed') {
      const s = r.urgency ?? 'unknown'
      byUrg[s] = (byUrg[s] ?? 0) + 1
    }
  }

  const avg =
    resolutionDays.length === 0
      ? null
      : resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length

  return {
    openCount,
    inProgressCount,
    resolvedThisMonth: resolvedMonth,
    avgDaysToResolve: avg === null ? null : Math.round(avg * 10) / 10,
    byUrgency: Object.entries(byUrg)
      .map(([urgency, count]) => ({ urgency, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export type ExpensesReport = {
  totalYtd: number
  byCategory: Array<{ category: string; amount: number; pct: number }>
}

export async function getExpensesReport(): Promise<ExpensesReport> {
  const supabase = await createServerClient()
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('expenses')
    .select('category, amount, incurred_on')
    .gte('incurred_on', `${year}-01-01`)
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]

  const byCat: Record<string, number> = {}
  let total = 0
  for (const r of rows) {
    const amt = Number(r.amount)
    total += amt
    byCat[r.category] = (byCat[r.category] ?? 0) + amt
  }

  const byCategory = Object.entries(byCat)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total === 0 ? 0 : (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { totalYtd: total, byCategory }
}

export type LeaseFlowReport = {
  activeLeases: number
  leasesEndingWithin90: number
  tenantsWithNoticeGiven: number
  signedThisYear: number
}

export async function getLeaseFlowReport(): Promise<LeaseFlowReport> {
  const supabase = await createServerClient()
  const year = new Date().getFullYear()
  const todayIso = new Date().toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [allLeases, noticeGiven, signed] = await Promise.all([
    supabase
      .from('leases')
      .select('id, status, end_date')
      .is('deleted_at', null),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('tenant_notice_given_on', 'is', null),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('start_date', `${year}-01-01`),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (allLeases.data ?? []) as any[]
  let active = 0
  let endingSoon = 0
  for (const l of rows) {
    if (l.status === 'active') {
      active += 1
      if (l.end_date >= todayIso && l.end_date <= in90) endingSoon += 1
    }
  }

  return {
    activeLeases: active,
    leasesEndingWithin90: endingSoon,
    tenantsWithNoticeGiven: noticeGiven.count ?? 0,
    signedThisYear: signed.count ?? 0,
  }
}
