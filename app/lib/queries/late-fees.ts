// ============================================================
// Late fee charge queries
// ============================================================
//
// Reads for the dashboard, late-rent workflow, and per-lease /
// per-rent-schedule views. Writes are in app/actions/late-fees.ts.

import { createServerClient } from '@/lib/supabase/server'
import type { LateFeeCharge } from '@/app/lib/schemas/late-fee'

export type LateFeeChargeWithContext = LateFeeCharge & {
  lease: {
    id: string
    monthly_rent: number
    tenant: {
      id: string
      first_name: string
      last_name: string
    } | null
    unit: {
      id: string
      unit_number: string | null
      property: {
        id: string
        name: string
        state: string | null
      } | null
    } | null
  } | null
  rent_schedule: {
    id: string
    due_date: string
    amount: number
    paid_amount: number
  } | null
}

const LEASE_CONTEXT_SELECT = `
  id, monthly_rent,
  tenant:tenants ( id, first_name, last_name ),
  unit:units (
    id, unit_number,
    property:properties ( id, name, state )
  )
`

const RENT_SCHEDULE_SELECT = `id, due_date, amount, paid_amount`

export async function listLateFees(): Promise<LateFeeChargeWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('late_fee_charges')
    .select(
      `*,
       lease:leases ( ${LEASE_CONTEXT_SELECT} ),
       rent_schedule:rent_schedules ( ${RENT_SCHEDULE_SELECT} )`,
    )
    .is('deleted_at', null)
    .order('applied_on', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    amount: Number(row.amount),
    state_max_percent:
      row.state_max_percent === null ? null : Number(row.state_max_percent),
    rent_schedule: row.rent_schedule
      ? {
          ...row.rent_schedule,
          amount: Number(row.rent_schedule.amount),
          paid_amount: Number(row.rent_schedule.paid_amount),
        }
      : null,
    lease: row.lease
      ? {
          ...row.lease,
          monthly_rent: Number(row.lease.monthly_rent),
        }
      : null,
  })) as LateFeeChargeWithContext[]
}

export async function getLateFeesForLease(
  leaseId: string,
): Promise<LateFeeCharge[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('late_fee_charges')
    .select('*')
    .eq('lease_id', leaseId)
    .is('deleted_at', null)
    .order('applied_on', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    state_max_percent:
      r.state_max_percent === null ? null : Number(r.state_max_percent),
  })) as LateFeeCharge[]
}

export async function getLateFeesForRentSchedule(
  rentScheduleId: string,
): Promise<LateFeeCharge[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('late_fee_charges')
    .select('*')
    .eq('rent_schedule_id', rentScheduleId)
    .is('deleted_at', null)
    .order('applied_on', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    state_max_percent:
      r.state_max_percent === null ? null : Number(r.state_max_percent),
  })) as LateFeeCharge[]
}

export type LateFeeSummary = {
  pendingCount: number
  pendingAmount: number
  paidCount: number
  paidAmount: number
  waivedCount: number
  lastScanAt: string | null
  lastScanSummary: Record<string, unknown> | null
}

export async function getLateFeeSummary(): Promise<LateFeeSummary> {
  const supabase = await createServerClient()

  const { data: charges, error: cErr } = await supabase
    .from('late_fee_charges')
    .select('amount, status')
    .is('deleted_at', null)

  if (cErr) throw cErr
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (charges ?? []) as any[]

  let pendingCount = 0
  let pendingAmount = 0
  let paidCount = 0
  let paidAmount = 0
  let waivedCount = 0
  for (const r of rows) {
    const amt = Number(r.amount)
    if (r.status === 'pending') {
      pendingCount += 1
      pendingAmount += amt
    } else if (r.status === 'paid') {
      paidCount += 1
      paidAmount += amt
    } else if (r.status === 'waived') {
      waivedCount += 1
    }
  }

  // Telemetry from landlord_settings
  const { data: settings } = await supabase
    .from('landlord_settings')
    .select('last_late_fee_scan_at, last_late_fee_scan_summary')
    .maybeSingle()

  return {
    pendingCount,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    paidCount,
    paidAmount: Math.round(paidAmount * 100) / 100,
    waivedCount,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastScanAt: ((settings as any)?.last_late_fee_scan_at as string) ?? null,
    lastScanSummary:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((settings as any)?.last_late_fee_scan_summary as Record<
        string,
        unknown
      >) ?? null,
  }
}
