// ============================================================
// Rent schedule read queries + status helpers
// ============================================================
//
// Generation lives in app/actions/rent.ts — this file is read-only.
// Status computation is done here (not in the DB) because it
// depends on "now" and on linked payment totals. DB rows store the
// last-computed status; the page recomputes on each load if the
// server action didn't refresh it yet.

import { createServerClient } from '@/lib/supabase/server'
import { now } from '@/app/lib/now'
import { computeRentScheduleStatus } from '@/app/lib/rent-schedule-status'
import type {
  RentSchedule,
  RentScheduleStatus,
  RentScheduleWithContext,
} from '@/app/lib/schemas/rent-schedule'

// Re-export with the original name so callers don't change. The
// pure implementation lives in @/app/lib/rent-schedule-status so
// it can be unit-tested without pulling Next's Supabase server
// client into the test bundle.
export function computeStatus(
  row: Pick<
    RentSchedule,
    'due_date' | 'amount' | 'paid_amount' | 'status'
  >,
  nowMs: number = now(),
): RentScheduleStatus {
  return computeRentScheduleStatus(row, nowMs)
}

export async function getRentSchedulesInWindow(
  startDate: string,
  endDate: string,
): Promise<RentScheduleWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('rent_schedules')
    .select(
      `
      id, owner_id, lease_id, due_date, amount, paid_amount, status,
      method, payment_id, notes, created_at, updated_at, deleted_at,
      lease:leases(
        id, monthly_rent, rent_due_day,
        tenant:tenants(id, first_name, last_name),
        unit:units(
          id, unit_number,
          property:properties(id, name)
        )
      )
      `,
    )
    .is('deleted_at', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    paid_amount: Number(r.paid_amount ?? 0),
  })) as RentScheduleWithContext[]
}

export async function getOverdueRentSchedules(): Promise<
  RentScheduleWithContext[]
> {
  const supabase = await createServerClient()
  const today = new Date(now()).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('rent_schedules')
    .select(
      `
      id, owner_id, lease_id, due_date, amount, paid_amount, status,
      method, payment_id, notes, created_at, updated_at, deleted_at,
      lease:leases(
        id, monthly_rent, rent_due_day,
        tenant:tenants(id, first_name, last_name),
        unit:units(
          id, unit_number,
          property:properties(id, name)
        )
      )
      `,
    )
    .is('deleted_at', null)
    .lt('due_date', today)
    .neq('status', 'paid')
    .neq('status', 'skipped')
    .order('due_date', { ascending: true })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
    paid_amount: Number(r.paid_amount ?? 0),
  })) as RentScheduleWithContext[]
}
