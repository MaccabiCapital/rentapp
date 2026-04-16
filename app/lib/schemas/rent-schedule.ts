// ============================================================
// Rent schedule (expected rent lines) schemas
// ============================================================
//
// Mirrors public.rent_schedules in db/schema.sql. Generated on
// demand when /dashboard/rent loads; one row per (lease, due_date).
//
// We are deliberately NOT building a Stripe collection flow here.
// Rent collection is blocked on the LLC + trust concerns from
// tenant interviews. What we CAN do in the meantime:
//   - model scheduled rent as a first-class resource
//   - let the landlord mark it paid manually (cash/zelle/check)
//   - run a simulate action that advances a demo cycle
//   - surface overdue rent in the dashboard upcoming-events feed

export const RENT_SCHEDULE_STATUS_VALUES = [
  'upcoming',
  'due',
  'paid',
  'partial',
  'overdue',
  'skipped',
] as const

export type RentScheduleStatus = (typeof RENT_SCHEDULE_STATUS_VALUES)[number]

export const RENT_SCHEDULE_STATUS_LABELS: Record<RentScheduleStatus, string> = {
  upcoming: 'Upcoming',
  due: 'Due',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  skipped: 'Skipped',
}

export const RENT_SCHEDULE_STATUS_TONE: Record<
  RentScheduleStatus,
  'zinc' | 'amber' | 'emerald' | 'red'
> = {
  upcoming: 'zinc',
  due: 'amber',
  paid: 'emerald',
  partial: 'amber',
  overdue: 'red',
  skipped: 'zinc',
}

export type RentSchedule = {
  id: string
  owner_id: string
  lease_id: string
  due_date: string
  amount: number
  paid_amount: number
  status: RentScheduleStatus
  method: string | null
  payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Hydrated row used by the /dashboard/rent grid. Joins lease →
// tenant + unit + property so a single row has everything we need
// to render the grid without N+1 client-side lookups.
export type RentScheduleWithContext = RentSchedule & {
  lease: {
    id: string
    monthly_rent: number
    rent_due_day: number
    tenant: { id: string; first_name: string; last_name: string } | null
    unit: {
      id: string
      unit_number: string | null
      property: { id: string; name: string } | null
    } | null
  }
}
