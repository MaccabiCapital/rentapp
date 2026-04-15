// ============================================================
// Lease validation schemas
// ============================================================
//
// Mirrors `public.leases` in db/schema.sql. `owner_id`, `unit_id`,
// and `tenant_id` are passed positionally or set by the server
// action — not collected from the form.
//
// Status rules for Sprint 2:
//   draft       — being prepared, tenant not yet signed
//   active      — currently in effect (unit.status → occupied)
//   expired     — end_date passed without renewal
//   terminated  — ended early (unit.status → vacant)
//   renewed     — replaced by a follow-on lease (Sprint 6)
//
// Sprint 2 implements only draft / active / terminated transitions
// through the UI. `expired` is set by a future scheduled job;
// `renewed` is Sprint 6's renewal flow.

import * as z from 'zod'

export const LEASE_STATUS_VALUES = [
  'draft',
  'active',
  'expired',
  'terminated',
  'renewed',
] as const

export type LeaseStatus = (typeof LEASE_STATUS_VALUES)[number]

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
  renewed: 'Renewed',
}

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: `${label} must be a YYYY-MM-DD date.`,
    })

const requiredPositiveDecimal = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, {
      error: `${label} must be greater than 0.`,
    })

const optionalPositiveDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    error: 'Must be a non-negative number.',
  })

const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v >= min && v <= max),
      { error: `${label} must be between ${min} and ${max}.` },
    )

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

export const LeaseCreateSchema = z
  .object({
    tenant_id: z.string().uuid({ error: 'Pick a tenant.' }),
    start_date: requiredDate('Start date'),
    end_date: requiredDate('End date'),
    monthly_rent: requiredPositiveDecimal('Monthly rent'),
    security_deposit: optionalPositiveDecimal,
    rent_due_day: optionalInt('Rent due day', 1, 31).transform(
      (v) => v ?? 1,
    ),
    late_fee_amount: optionalPositiveDecimal,
    late_fee_grace_days: optionalInt('Grace days', 0, 30),
    status: z
      .enum(LEASE_STATUS_VALUES, { error: 'Pick a valid status.' })
      .default('draft'),
    notes: optionalText,
  })
  .refine((v) => v.end_date >= v.start_date, {
    error: 'End date must be on or after start date.',
    path: ['end_date'],
  })

// Update omits tenant_id (cannot reassign a lease to a different tenant
// — that's a new lease). Everything else is editable.
export const LeaseUpdateSchema = z
  .object({
    start_date: requiredDate('Start date'),
    end_date: requiredDate('End date'),
    monthly_rent: requiredPositiveDecimal('Monthly rent'),
    security_deposit: optionalPositiveDecimal,
    rent_due_day: optionalInt('Rent due day', 1, 31).transform(
      (v) => v ?? 1,
    ),
    late_fee_amount: optionalPositiveDecimal,
    late_fee_grace_days: optionalInt('Grace days', 0, 30),
    status: z.enum(LEASE_STATUS_VALUES, { error: 'Pick a valid status.' }),
    notes: optionalText,
  })
  .refine((v) => v.end_date >= v.start_date, {
    error: 'End date must be on or after start date.',
    path: ['end_date'],
  })

export type LeaseCreateInput = z.infer<typeof LeaseCreateSchema>
export type LeaseUpdateInput = z.infer<typeof LeaseUpdateSchema>

export type Lease = {
  id: string
  owner_id: string
  unit_id: string
  tenant_id: string
  status: LeaseStatus
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number | null
  rent_due_day: number
  late_fee_amount: number | null
  late_fee_grace_days: number | null
  document_url: string | null
  signed_at: string | null
  tenant_notice_given_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
