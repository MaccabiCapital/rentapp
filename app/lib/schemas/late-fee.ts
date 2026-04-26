// ============================================================
// Late fee charge schemas
// ============================================================
//
// Mirrors public.late_fee_charges in
// db/migrations/2026_04_26_late_fee_charges.sql.

import * as z from 'zod'

export const LATE_FEE_STATUS_VALUES = ['pending', 'paid', 'waived'] as const
export type LateFeeStatus = (typeof LATE_FEE_STATUS_VALUES)[number]

export const LATE_FEE_STATUS_LABELS: Record<LateFeeStatus, string> = {
  pending: 'Owed',
  paid: 'Paid',
  waived: 'Waived',
}

export const LATE_FEE_STATUS_BADGE: Record<LateFeeStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  waived: 'bg-zinc-100 text-zinc-700',
}

export const LATE_FEE_SOURCE_VALUES = ['auto_scan', 'manual'] as const
export type LateFeeSource = (typeof LATE_FEE_SOURCE_VALUES)[number]

export const LATE_FEE_SOURCE_LABELS: Record<LateFeeSource, string> = {
  auto_scan: 'Auto-applied',
  manual: 'Manually applied',
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const moneyAmount = z
  .string()
  .trim()
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v) && v >= 0, {
    error: 'Amount must be zero or greater.',
  })

// ------------------------------------------------------------
// Manually apply a late fee
// ------------------------------------------------------------

export const ApplyLateFeeSchema = z.object({
  rent_schedule_id: z.string().trim().uuid(),
  amount: moneyAmount,
  notes: optionalText,
})

export type ApplyLateFeeInput = z.infer<typeof ApplyLateFeeSchema>

// ------------------------------------------------------------
// Waive
// ------------------------------------------------------------

export const WaiveLateFeeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: 'A short reason is required for the audit log.' })
    .max(500),
})

export type WaiveLateFeeInput = z.infer<typeof WaiveLateFeeSchema>

// ------------------------------------------------------------
// Mark paid (date capture)
// ------------------------------------------------------------

export const MarkLateFeePaidSchema = z.object({
  paid_on: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: 'Use a YYYY-MM-DD date.',
    }),
})

export type MarkLateFeePaidInput = z.infer<typeof MarkLateFeePaidSchema>

// ------------------------------------------------------------
// Lease late fee config (already lives on the leases table; this
// form just edits those existing fields)
// ------------------------------------------------------------

export const LeaseLateFeeConfigSchema = z.object({
  late_fee_amount: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      error: 'Late fee must be zero or greater (or empty for none).',
    }),
  late_fee_grace_days: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? 5 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 30, {
      error: 'Grace period must be between 0 and 30 days.',
    }),
})

export type LeaseLateFeeConfigInput = z.infer<typeof LeaseLateFeeConfigSchema>

// ------------------------------------------------------------
// DB row shape
// ------------------------------------------------------------

export type LateFeeCharge = {
  id: string
  owner_id: string
  lease_id: string
  rent_schedule_id: string
  amount: number
  status: LateFeeStatus
  source: LateFeeSource
  state_max_percent: number | null
  applied_on: string
  paid_at: string | null
  waived_at: string | null
  waived_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}
