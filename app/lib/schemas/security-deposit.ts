// ============================================================
// Security deposit settlement validation schemas
// ============================================================
//
// Mirrors public.security_deposit_settlements and
// public.security_deposit_deduction_items in
// db/migrations/2026_04_26_security_deposit_settlements.sql.
//
// A "settlement" is one move-out accounting letter. It holds the
// original deposit, an itemized list of deductions, a forwarding
// address snapshot, and the legal mailing deadline.

import * as z from 'zod'

// ------------------------------------------------------------
// Enums
// ------------------------------------------------------------

export const SETTLEMENT_STATUS_VALUES = [
  'draft',
  'finalized',
  'mailed',
] as const

export type SettlementStatus = (typeof SETTLEMENT_STATUS_VALUES)[number]

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: 'Draft',
  finalized: 'Ready to mail',
  mailed: 'Mailed',
}

export const DEDUCTION_CATEGORY_VALUES = [
  'damage',
  'cleaning',
  'unpaid_rent',
  'unpaid_utilities',
  'late_fees',
  'lockout_or_keys',
  'other',
] as const

export type DeductionCategory = (typeof DEDUCTION_CATEGORY_VALUES)[number]

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = {
  damage: 'Damage repair',
  cleaning: 'Cleaning',
  unpaid_rent: 'Unpaid rent',
  unpaid_utilities: 'Unpaid utilities',
  late_fees: 'Late fees',
  lockout_or_keys: 'Lockout / keys',
  other: 'Other',
}

export const MAIL_METHOD_VALUES = [
  'first_class_mail',
  'certified_mail',
  'hand_delivered',
  'electronic_with_consent',
] as const

export type MailMethod = (typeof MAIL_METHOD_VALUES)[number]

export const MAIL_METHOD_LABELS: Record<MailMethod, string> = {
  first_class_mail: 'First-class mail',
  certified_mail: 'Certified mail (with return receipt)',
  hand_delivered: 'Hand-delivered',
  electronic_with_consent: 'Electronic (with prior written consent)',
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

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
// Settlement create — landlord picks a lease, we snapshot deposit
// + tenant forwarding address + auto-suggest damage deductions.
// ------------------------------------------------------------

export const SettlementCreateSchema = z.object({
  lease_id: z.string().trim().uuid({ error: 'Pick a lease.' }),
})

export type SettlementCreateInput = z.infer<typeof SettlementCreateSchema>

// ------------------------------------------------------------
// Settlement update — header fields the landlord can edit while
// the settlement is still in draft.
// ------------------------------------------------------------

export const SettlementUpdateSchema = z.object({
  forwarding_street_address: optionalText,
  forwarding_unit: optionalText,
  forwarding_city: optionalText,
  forwarding_state: optionalText,
  forwarding_postal_code: optionalText,
  notes: optionalText,
})

export type SettlementUpdateInput = z.infer<typeof SettlementUpdateSchema>

// ------------------------------------------------------------
// Mark as mailed
// ------------------------------------------------------------

export const SettlementMarkMailedSchema = z.object({
  mail_method: z.enum(MAIL_METHOD_VALUES, {
    error: 'Pick a mailing method.',
  }),
  mail_tracking_number: optionalText,
  mailed_on: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: 'Use a YYYY-MM-DD date.',
    }),
})

export type SettlementMarkMailedInput = z.infer<
  typeof SettlementMarkMailedSchema
>

// ------------------------------------------------------------
// Deduction items
// ------------------------------------------------------------

export const DeductionItemCreateSchema = z.object({
  settlement_id: z.string().trim().uuid(),
  category: z.enum(DEDUCTION_CATEGORY_VALUES, {
    error: 'Pick a category.',
  }),
  description: z
    .string()
    .trim()
    .min(1, { error: 'Description is required.' })
    .max(500, { error: 'Keep it under 500 characters.' }),
  amount: moneyAmount,
})

export type DeductionItemCreateInput = z.infer<
  typeof DeductionItemCreateSchema
>

export const DeductionItemUpdateSchema = z.object({
  category: z.enum(DEDUCTION_CATEGORY_VALUES),
  description: z
    .string()
    .trim()
    .min(1, { error: 'Description is required.' })
    .max(500),
  amount: moneyAmount,
})

export type DeductionItemUpdateInput = z.infer<
  typeof DeductionItemUpdateSchema
>

// ------------------------------------------------------------
// Tenant forwarding address (lives on the tenant record)
// ------------------------------------------------------------

export const TenantForwardingSchema = z.object({
  forwarding_street_address: optionalText,
  forwarding_unit: optionalText,
  forwarding_city: optionalText,
  forwarding_state: optionalText,
  forwarding_postal_code: optionalText,
})

export type TenantForwardingInput = z.infer<typeof TenantForwardingSchema>

// ------------------------------------------------------------
// DB row shapes
// ------------------------------------------------------------

export type SecurityDepositSettlement = {
  id: string
  owner_id: string
  lease_id: string
  status: SettlementStatus
  original_deposit: number
  forwarding_street_address: string | null
  forwarding_unit: string | null
  forwarding_city: string | null
  forwarding_state: string | null
  forwarding_postal_code: string | null
  state_return_days: number | null
  legal_deadline_date: string | null
  mail_method: MailMethod | null
  mail_tracking_number: string | null
  mailed_at: string | null
  notes: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type DeductionItem = {
  id: string
  settlement_id: string
  category: DeductionCategory
  description: string
  amount: number
  inspection_item_id: string | null
  photos: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

// ------------------------------------------------------------
// Display helpers
// ------------------------------------------------------------

export const STATUS_BADGE: Record<SettlementStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  finalized: 'bg-amber-100 text-amber-800',
  mailed: 'bg-emerald-100 text-emerald-800',
}

export function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// Net = original_deposit - sum(deductions). Positive = refund to
// tenant. Negative = balance still owed by tenant. Zero = wash.
export function calculateNet(
  originalDeposit: number,
  deductions: DeductionItem[],
): { totalDeductions: number; net: number } {
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + Number(d.amount),
    0,
  )
  const net = Number(originalDeposit) - totalDeductions
  return {
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    net: Math.round(net * 100) / 100,
  }
}

// Add days to a YYYY-MM-DD date and return YYYY-MM-DD.
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
