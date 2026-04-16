// ============================================================
// Pure rent-schedule status computation
// ============================================================
//
// Split out from queries/rent-schedules.ts so it can be unit-
// tested without pulling in the Next.js Supabase server client.
// DB rows store the last-computed status; the dashboard page
// may recompute on load if time has moved past the stored state.

import type { RentScheduleStatus } from '@/app/lib/schemas/rent-schedule'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DUE_WINDOW_DAYS = 3

type StatusInput = {
  due_date: string
  amount: number
  paid_amount: number
  status: RentScheduleStatus
}

export function computeRentScheduleStatus(
  row: StatusInput,
  nowMs: number,
): RentScheduleStatus {
  // Respect an explicit landlord skip.
  if (row.status === 'skipped') return 'skipped'

  const amt = Number(row.amount)
  const paid = Number(row.paid_amount)

  if (paid >= amt) return 'paid'

  // Compare date-only, not timestamp-vs-midnight. A rent line
  // due today is NOT overdue at noon — it's still "due today".
  // We anchor both sides to UTC midnight so a tenant in PST vs
  // EST lands in the same bucket.
  const dueAtMidnightMs = dateOnlyToMidnightUtcMs(row.due_date)
  const nowAtMidnightMs = midnightUtcMsOf(nowMs)

  if (paid > 0 && paid < amt) {
    // Partial keeps the 'partial' label even past the due date;
    // the UI tone conveys urgency separately.
    return 'partial'
  }

  if (dueAtMidnightMs < nowAtMidnightMs) return 'overdue'

  if (
    dueAtMidnightMs - nowAtMidnightMs <=
    DUE_WINDOW_DAYS * MS_PER_DAY
  ) {
    return 'due'
  }

  return 'upcoming'
}

function dateOnlyToMidnightUtcMs(isoDate: string): number {
  // Accept 'YYYY-MM-DD' and pin to 00:00:00 UTC.
  return new Date(`${isoDate}T00:00:00Z`).getTime()
}

function midnightUtcMsOf(ms: number): number {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
