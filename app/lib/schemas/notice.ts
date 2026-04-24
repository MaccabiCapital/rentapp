// ============================================================
// Notice validation schemas + shared types
// ============================================================
//
// Each notice type has a different shape of `data` payload.
// Zod schemas per-type validate user input before insert into
// the public.notices.data jsonb column.
//
// THE GENERATED NOTICE IS A DRAFT. It is not a legal document
// until reviewed by an attorney licensed in the property's state.
// The PDF template enforces this with a top banner on every page.

import * as z from 'zod'

export const NOTICE_TYPE_VALUES = [
  'rent_increase',
  'entry',
  'late_rent',
  'cure_or_quit',
  'terminate_tenancy',
  'move_out_info',
] as const

export type NoticeType = (typeof NOTICE_TYPE_VALUES)[number]

export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  rent_increase: 'Notice of rent increase',
  entry: 'Notice to enter',
  late_rent: 'Late rent notice',
  cure_or_quit: 'Notice to pay or quit',
  terminate_tenancy: 'Notice to terminate tenancy',
  move_out_info: 'Move-out information packet',
}

export const NOTICE_TYPE_DESCRIPTIONS: Record<NoticeType, string> = {
  rent_increase:
    "Inform the tenant rent is going up. Check your state's required notice window before using.",
  entry:
    "Required before entering the unit for non-emergency reasons (repairs, inspections, showings). Most states require 24–48 hours' notice.",
  late_rent:
    'First reminder when rent is past due. Lower stakes than a pay-or-quit.',
  cure_or_quit:
    'Formal demand for overdue rent with a deadline to pay before eviction can begin. State-specific deadlines apply.',
  terminate_tenancy:
    'Notice of intent to end the tenancy at lease expiration or for cause. Check state-required notice days.',
  move_out_info:
    "Information packet for a tenant who's given notice. Covers your right to show the unit, move-out day procedures, security deposit process, and utility transfer.",
}

export const NOTICE_METHOD_VALUES = [
  'hand_delivery',
  'mail',
  'certified_mail',
  'email',
  'posting',
  'other',
] as const

export type NoticeMethod = (typeof NOTICE_METHOD_VALUES)[number]

export const NOTICE_METHOD_LABELS: Record<NoticeMethod, string> = {
  hand_delivery: 'Hand delivered',
  mail: 'Regular mail',
  certified_mail: 'Certified mail',
  email: 'Email',
  posting: 'Posted on unit',
  other: 'Other',
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const positiveDecimalRequired = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, {
      error: `${label} must be a positive number.`,
    })

const positiveDecimalOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    error: 'Must be a non-negative number.',
  })

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: 'Use a YYYY-MM-DD date.',
    })

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const requiredTime = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .refine((v) => /^\d{2}:\d{2}$/.test(v), {
      error: 'Use a HH:MM (24-hour) time.',
    })

// ------------------------------------------------------------
// Per-type data schemas (what lives in notices.data JSONB)
// ------------------------------------------------------------

export const RentIncreaseDataSchema = z.object({
  current_monthly_rent: positiveDecimalRequired('Current rent'),
  new_monthly_rent: positiveDecimalRequired('New rent'),
  effective_date: requiredDate('Effective date'),
  reason: optionalText,
})
export type RentIncreaseData = z.infer<typeof RentIncreaseDataSchema>

export const ENTRY_REASONS = [
  'repair',
  'inspection',
  'showing',
  'emergency',
  'other',
] as const
export type EntryReason = (typeof ENTRY_REASONS)[number]
export const ENTRY_REASON_LABELS: Record<EntryReason, string> = {
  repair: 'Repair or maintenance',
  inspection: 'Inspection',
  showing: 'Showing to a prospective tenant or buyer',
  emergency: 'Emergency',
  other: 'Other',
}

export const EntryDataSchema = z.object({
  entry_date: requiredDate('Entry date'),
  entry_time_start: requiredTime('Start time'),
  entry_time_end: requiredTime('End time'),
  reason: z.enum(ENTRY_REASONS, { error: 'Pick a reason.' }),
  details: optionalText,
})
export type EntryData = z.infer<typeof EntryDataSchema>

export const LateRentDataSchema = z.object({
  amount_due: positiveDecimalRequired('Amount due'),
  original_due_date: requiredDate('Original due date'),
  late_fee: positiveDecimalOptional,
  total_owed: positiveDecimalRequired('Total owed'),
})
export type LateRentData = z.infer<typeof LateRentDataSchema>

export const CureOrQuitDataSchema = z.object({
  amount_due: positiveDecimalRequired('Amount due'),
  cure_deadline_date: requiredDate('Deadline to pay'),
})
export type CureOrQuitData = z.infer<typeof CureOrQuitDataSchema>

export const TERMINATE_REASONS = [
  'non_renewal',
  'for_cause',
  'sale_of_property',
  'other',
] as const
export type TerminateReason = (typeof TERMINATE_REASONS)[number]
export const TERMINATE_REASON_LABELS: Record<TerminateReason, string> = {
  non_renewal: 'Non-renewal at lease end',
  for_cause: 'For cause (lease violation)',
  sale_of_property: 'Sale of property',
  other: 'Other',
}

export const TerminateTenancyDataSchema = z.object({
  termination_date: requiredDate('Termination date'),
  reason: z.enum(TERMINATE_REASONS, { error: 'Pick a reason.' }),
  details: optionalText,
})
export type TerminateTenancyData = z.infer<typeof TerminateTenancyDataSchema>

const positiveIntRequired = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v > 0, {
      error: `${label} must be a positive whole number.`,
    })

export const MoveOutInfoDataSchema = z.object({
  anticipated_move_out_date: requiredDate('Anticipated move-out date'),
  showing_notice_hours: positiveIntRequired('Showing notice hours'),
  showings_policy: optionalText,
  move_out_day_instructions: optionalText,
  elevator_or_dock_booking: optionalText,
  keys_return_instructions: optionalText,
  utility_transfer_note: optionalText,
  forwarding_address_request: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
})
export type MoveOutInfoData = z.infer<typeof MoveOutInfoDataSchema>

// ------------------------------------------------------------
// Create / update schemas (form → DB)
// ------------------------------------------------------------

export const NoticeCreateSchema = z.object({
  lease_id: z.string().trim().uuid({ error: 'Pick a lease.' }),
  type: z.enum(NOTICE_TYPE_VALUES, { error: 'Pick a notice type.' }),
  notes: optionalText,
  // The `data` object is parsed per-type downstream.
})
export type NoticeCreateInput = z.infer<typeof NoticeCreateSchema>

export const NoticeMarkServedSchema = z.object({
  served_at: requiredDate('Served date'),
  served_method: z.enum(NOTICE_METHOD_VALUES, {
    error: 'Pick a delivery method.',
  }),
  notes: optionalText,
})
export type NoticeMarkServedInput = z.infer<typeof NoticeMarkServedSchema>

// ------------------------------------------------------------
// DB row shape
// ------------------------------------------------------------

export type Notice = {
  id: string
  owner_id: string
  lease_id: string
  type: NoticeType
  data: Record<string, unknown>
  served_at: string | null
  served_method: NoticeMethod | null
  notes: string | null
  generated_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Map from type to the schema used to parse its data column.
export function parseNoticeData(type: NoticeType, raw: unknown): unknown {
  switch (type) {
    case 'rent_increase':
      return RentIncreaseDataSchema.parse(raw)
    case 'entry':
      return EntryDataSchema.parse(raw)
    case 'late_rent':
      return LateRentDataSchema.parse(raw)
    case 'cure_or_quit':
      return CureOrQuitDataSchema.parse(raw)
    case 'terminate_tenancy':
      return TerminateTenancyDataSchema.parse(raw)
    case 'move_out_info':
      return MoveOutInfoDataSchema.parse(raw)
  }
}
