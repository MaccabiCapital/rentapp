// ============================================================
// Expense validation schemas
// ============================================================
//
// Mirrors `public.expenses` in db/schema.sql. Categories map
// directly to Schedule E (Form 1040) line items so the CSV
// export works for tax time without reclassification.

import * as z from 'zod'

export const EXPENSE_CATEGORY_VALUES = [
  'advertising',
  'cleaning_maintenance',
  'commissions',
  'insurance',
  'legal_professional',
  'management_fees',
  'mortgage_interest',
  'other_interest',
  'repairs',
  'supplies',
  'taxes',
  'utilities',
  'depreciation',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  advertising: 'Advertising',
  cleaning_maintenance: 'Cleaning & maintenance',
  commissions: 'Commissions',
  insurance: 'Insurance',
  legal_professional: 'Legal & professional fees',
  management_fees: 'Management fees',
  mortgage_interest: 'Mortgage interest',
  other_interest: 'Other interest',
  repairs: 'Repairs',
  supplies: 'Supplies',
  taxes: 'Taxes',
  utilities: 'Utilities',
  depreciation: 'Depreciation',
  other: 'Other',
}

// Schedule E line numbers for the CSV export
export const SCHEDULE_E_LINES: Record<ExpenseCategory, string> = {
  advertising: '5',
  cleaning_maintenance: '7',
  commissions: '8',
  insurance: '9',
  legal_professional: '10',
  management_fees: '11',
  mortgage_interest: '12',
  other_interest: '13',
  repairs: '14',
  supplies: '15',
  taxes: '16',
  utilities: '17',
  depreciation: '18',
  other: '19',
}

const trimmedNonEmpty = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const requiredPositive = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, {
      error: `${label} must be greater than 0.`,
    })

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: `${label} must be a YYYY-MM-DD date.`,
    })

export const ExpenseCreateSchema = z.object({
  property_id: trimmedNonEmpty('Property'),
  category: z.enum(EXPENSE_CATEGORY_VALUES, {
    error: 'Pick a valid category.',
  }),
  amount: requiredPositive('Amount'),
  incurred_on: requiredDate('Date'),
  vendor: optionalText,
  description: optionalText,
  notes: optionalText,
})

export const ExpenseUpdateSchema = ExpenseCreateSchema

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdateSchema>

export type Expense = {
  id: string
  owner_id: string
  property_id: string
  category: ExpenseCategory
  amount: number
  incurred_on: string
  vendor: string | null
  description: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Manual income entry — goes into public.payments with a synthetic
// lease link (the user picks the lease). Lets landlords log rent
// received via Zelle/check before Stripe rent collection ships.

export const MANUAL_INCOME_METHODS = [
  'cash',
  'check',
  'zelle',
  'venmo',
  'bank_transfer',
  'other',
] as const

export type ManualIncomeMethod = (typeof MANUAL_INCOME_METHODS)[number]

export const MANUAL_INCOME_METHOD_LABELS: Record<ManualIncomeMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  venmo: 'Venmo',
  bank_transfer: 'Bank transfer',
  other: 'Other',
}

export const ManualIncomeSchema = z.object({
  lease_id: trimmedNonEmpty('Lease'),
  amount: requiredPositive('Amount'),
  received_on: requiredDate('Date received'),
  payment_method: z.enum(MANUAL_INCOME_METHODS, {
    error: 'Pick a valid method.',
  }),
  notes: optionalText,
})

export type ManualIncomeInput = z.infer<typeof ManualIncomeSchema>
