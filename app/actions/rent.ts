'use server'

// ============================================================
// Rent schedule generation + simulation server actions
// ============================================================

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { now } from '@/app/lib/now'
import type { ActionState } from '@/app/lib/types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Return a YYYY-MM-DD string for (year, monthZeroIndexed, dueDay),
// clamping the day to the last day of the month when dueDay
// overshoots (e.g. rent_due_day=31 in a 30-day month).
function dueDateFor(year: number, month: number, dueDay: number): string {
  // JS Date handles negative/overflow days; we want the last valid
  // day in the month, so compute manually.
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(dueDay, lastDay)
  const d = new Date(year, month, day)
  const yyyy = d.getFullYear().toString().padStart(4, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Generate the set of due_dates in [fromDate, toDate] for a given
// monthly-rent lease (cycle = monthly), respecting rent_due_day.
function dueDatesBetween(
  fromIso: string,
  toIso: string,
  dueDay: number,
): string[] {
  const from = new Date(fromIso + 'T00:00:00')
  const out: string[] = []
  let y = from.getFullYear()
  let m = from.getMonth()
  // Walk month-by-month. Stop when the generated date is strictly
  // after `to`.
  // Hard cap on iterations so a pathological input can't loop
  // forever — 36 months covers any reasonable simulate-ahead window.
  for (let i = 0; i < 36; i++) {
    const iso = dueDateFor(y, m, dueDay)
    if (iso > toIso) break
    if (iso >= fromIso) out.push(iso)
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
  }
  return out
}

// Ensures schedule rows exist for every active lease for every
// due_date in [lookbackStart, lookaheadEnd]. Idempotent — relies
// on the (lease_id, due_date) unique index so repeat calls are
// safe. Returns the count of new rows inserted.
async function ensureSchedulesForActiveLeases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ownerId: string,
  lookbackDays: number,
  lookaheadDays: number,
): Promise<number> {
  const nowMs = now()
  const fromIso = new Date(nowMs - lookbackDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)
  const toIso = new Date(nowMs + lookaheadDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)

  const { data: leases, error: leasesErr } = await supabase
    .from('leases')
    .select('id, monthly_rent, rent_due_day, start_date, end_date')
    .is('deleted_at', null)
    .eq('status', 'active')
  if (leasesErr) throw leasesErr

  // Pull existing schedule rows in the window so we can skip them.
  const leaseIds = (leases ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => l.id as string,
  )
  const existing = new Set<string>()
  if (leaseIds.length > 0) {
    const { data: existingRows, error: exErr } = await supabase
      .from('rent_schedules')
      .select('lease_id, due_date')
      .in('lease_id', leaseIds)
      .gte('due_date', fromIso)
      .lte('due_date', toIso)
    if (exErr) throw exErr
    for (const row of existingRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any
      existing.add(`${r.lease_id}|${r.due_date}`)
    }
  }

  const toInsert: Array<{
    owner_id: string
    lease_id: string
    due_date: string
    amount: number
    status: 'upcoming'
  }> = []
  for (const lease of leases ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = lease as any
    // Clamp the generation window to the lease's own term.
    const leaseStart = l.start_date as string
    const leaseEnd = l.end_date as string
    const windowStart = fromIso > leaseStart ? fromIso : leaseStart
    const windowEnd = toIso < leaseEnd ? toIso : leaseEnd
    if (windowStart > windowEnd) continue
    const dueDay = Number(l.rent_due_day ?? 1)
    const dates = dueDatesBetween(windowStart, windowEnd, dueDay)
    for (const d of dates) {
      const key = `${l.id}|${d}`
      if (existing.has(key)) continue
      toInsert.push({
        owner_id: ownerId,
        lease_id: l.id,
        due_date: d,
        amount: Number(l.monthly_rent),
        status: 'upcoming',
      })
    }
  }

  if (toInsert.length === 0) return 0
  const { error: insErr } = await supabase
    .from('rent_schedules')
    .insert(toInsert)
  if (insErr) throw insErr
  return toInsert.length
}

// Called from the /dashboard/rent page loader. Keeps rows fresh
// for the default window (1 month back, 3 weeks ahead) plus
// recomputes status (paid/overdue/etc) for any row whose stored
// status is out of date with "now".
export async function ensureRentSchedules(): Promise<{
  generated: number
  statusUpdates: number
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { generated: 0, statusUpdates: 0 }

  const generated = await ensureSchedulesForActiveLeases(
    supabase,
    user.id,
    30,
    21,
  )
  const statusUpdates = await recomputeStaleStatuses(supabase)
  return { generated, statusUpdates }
}

// Walk the recent window and flip upcoming→due and upcoming/due→overdue
// where time has moved on. We avoid touching rows the landlord has
// marked skipped or that are already paid.
async function recomputeStaleStatuses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<number> {
  const nowMs = now()
  const todayIso = new Date(nowMs).toISOString().slice(0, 10)
  const inThreeIso = new Date(nowMs + 3 * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)

  let count = 0

  // Overdue: due_date < today and status in (upcoming, due). We
  // intentionally do NOT touch 'partial' rows — those stay labeled
  // 'partial' indefinitely so the UI tone conveys urgency
  // separately (see rent-schedule-status.ts).
  const { data: overdueRows, error: overdueErr } = await supabase
    .from('rent_schedules')
    .select('id')
    .is('deleted_at', null)
    .lt('due_date', todayIso)
    .in('status', ['upcoming', 'due'])
  if (overdueErr) throw overdueErr
  const overdueIds =
    (overdueRows ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.id as string)
  if (overdueIds.length > 0) {
    const { error } = await supabase
      .from('rent_schedules')
      .update({ status: 'overdue' })
      .in('id', overdueIds)
    if (error) throw error
    count += overdueIds.length
  }

  // Due: due_date in [today, today+3d] and status=upcoming
  const { data: dueRows, error: dueErr } = await supabase
    .from('rent_schedules')
    .select('id')
    .is('deleted_at', null)
    .gte('due_date', todayIso)
    .lte('due_date', inThreeIso)
    .eq('status', 'upcoming')
  if (dueErr) throw dueErr
  const dueIds =
    (dueRows ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.id as string)
  if (dueIds.length > 0) {
    const { error } = await supabase
      .from('rent_schedules')
      .update({ status: 'due' })
      .in('id', dueIds)
    if (error) throw error
    count += dueIds.length
  }

  return count
}

export async function markRentScheduleCollected(
  scheduleId: string,
  method: string = 'cash',
): Promise<ActionState> {
  const supabase = await createServerClient()

  const { data: row, error: loadErr } = await supabase
    .from('rent_schedules')
    .select(
      'id, owner_id, lease_id, amount, paid_amount, status, due_date, lease:leases(unit_id, tenant_id)',
    )
    .eq('id', scheduleId)
    .maybeSingle()
  if (loadErr || !row) {
    return { success: false, message: 'Could not find that rent line.' }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any

  const amount = Number(r.amount)
  const paidNow = amount
  const todayIso = new Date(now()).toISOString().slice(0, 10)

  // Write a real payment row so financials stay consistent.
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      owner_id: r.owner_id,
      lease_id: r.lease_id,
      unit_id: r.lease?.unit_id ?? null,
      tenant_id: r.lease?.tenant_id ?? null,
      amount,
      paid_on: todayIso,
      method,
      status: 'completed',
      notes: `Rent for ${r.due_date}`,
    })
    .select('id')
    .single()
  if (payErr || !payment) {
    return {
      success: false,
      message: `Could not record the payment: ${payErr?.message ?? 'unknown error'}`,
    }
  }

  const { error: schedErr } = await supabase
    .from('rent_schedules')
    .update({
      paid_amount: paidNow,
      status: 'paid',
      method,
      payment_id: payment.id,
    })
    .eq('id', scheduleId)
  if (schedErr) {
    return {
      success: false,
      message: `Payment recorded but schedule could not update: ${schedErr.message}`,
    }
  }

  revalidatePath('/dashboard/rent')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/financials')
  return { success: true }
}

// Simulate a rent cycle: advance all upcoming/due rows in the
// window to "paid" to mimic month-end processing. Useful for
// demoing the flow without waiting for real dates to roll over.
export async function simulateRentCycle(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      message: 'You must be signed in to simulate rent.',
    }
  }

  // First make sure we have schedule rows to simulate against.
  await ensureSchedulesForActiveLeases(supabase, user.id, 30, 21)

  // Pull upcoming/due/overdue rows within the next 21 days plus
  // anything still open in the past. We'll pay them all and write
  // a payment row per line. We intentionally skip rows already
  // paid or explicitly skipped.
  const windowEnd = new Date(now() + 21 * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)

  const { data: targets, error: tErr } = await supabase
    .from('rent_schedules')
    .select(
      'id, lease_id, amount, due_date, paid_amount, lease:leases(unit_id, tenant_id)',
    )
    .is('deleted_at', null)
    .lte('due_date', windowEnd)
    .in('status', ['upcoming', 'due', 'overdue', 'partial'])
  if (tErr) {
    return {
      success: false,
      message: `Could not load rent lines to simulate: ${tErr.message}`,
    }
  }

  const todayIso = new Date(now()).toISOString().slice(0, 10)
  let paidCount = 0
  let failCount = 0

  for (const row of targets ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const amount = Number(r.amount)
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        owner_id: user.id,
        lease_id: r.lease_id,
        unit_id: r.lease?.unit_id ?? null,
        tenant_id: r.lease?.tenant_id ?? null,
        amount,
        paid_on: todayIso,
        method: 'simulated',
        status: 'completed',
        notes: `[SIMULATED] Rent for ${r.due_date}`,
      })
      .select('id')
      .single()
    if (payErr || !payment) {
      failCount += 1
      continue
    }
    const { error: schedErr } = await supabase
      .from('rent_schedules')
      .update({
        paid_amount: amount,
        status: 'paid',
        method: 'simulated',
        payment_id: payment.id,
      })
      .eq('id', r.id)
    if (schedErr) {
      failCount += 1
    } else {
      paidCount += 1
    }
  }

  revalidatePath('/dashboard/rent')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/financials')

  if (paidCount === 0 && failCount === 0) {
    return {
      success: false,
      message:
        'Nothing to simulate — no upcoming, due, or overdue rent lines in the next 3 weeks.',
    }
  }
  if (failCount > 0) {
    return {
      success: false,
      message: `Simulated ${paidCount} rent line${paidCount === 1 ? '' : 's'} but ${failCount} failed.`,
    }
  }
  return { success: true }
}
