// ============================================================
// Unit validation schemas
// ============================================================
//
// Mirrors `public.units` in db/schema.sql. `owner_id` and
// `property_id` are passed positionally to server actions, not
// through the form, so they are not in the form schemas.
//
// Sprint 1 defers `amenities` and `photos` to Sprint 2 per
// spec (S1-T8). Status enum matches the `unit_status` Postgres type.

import * as z from 'zod'

export const UNIT_STATUS_VALUES = [
  'occupied',
  'vacant',
  'pending',
  'notice_given',
] as const

export type UnitStatus = (typeof UNIT_STATUS_VALUES)[number]

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  pending: 'Pending',
  notice_given: 'Notice Given',
}

// FormData serializes numbers as strings; these helpers coerce
// while preserving "not supplied" as undefined (so the DB gets
// NULL, not 0).
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const optionalPositiveInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), {
    error: 'Must be a non-negative whole number.',
  })

const optionalPositiveDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    error: 'Must be a non-negative number.',
  })

// Monthly rent is required and must be > 0 per red-team Q1 feedback.
const requiredPositiveDecimal = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, {
      error: `${label} must be greater than 0.`,
    })

export const UnitCreateSchema = z.object({
  unit_number: optionalString,
  bedrooms: optionalPositiveInt,
  bathrooms: optionalPositiveDecimal,
  square_feet: optionalPositiveInt,
  monthly_rent: requiredPositiveDecimal('Monthly rent'),
  security_deposit: optionalPositiveDecimal,
  status: z
    .enum(UNIT_STATUS_VALUES, {
      error: 'Please pick a valid status.',
    })
    .default('vacant'),
})

export const UnitUpdateSchema = UnitCreateSchema

export type UnitCreateInput = z.infer<typeof UnitCreateSchema>
export type UnitUpdateInput = z.infer<typeof UnitUpdateSchema>

// Database row shape (what Supabase returns on select).
export type Unit = {
  id: string
  owner_id: string
  property_id: string
  unit_number: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  monthly_rent: number | null
  security_deposit: number | null
  status: UnitStatus
  amenities: string[]
  photos: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}
