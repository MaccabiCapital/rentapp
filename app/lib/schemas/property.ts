// ============================================================
// Property validation schemas
// ============================================================
//
// Single source of truth for property form validation, shared
// between server actions and form components. Mirrors the
// `public.properties` table in db/schema.sql.
//
// Required fields match the NOT NULL constraints on the table:
//   name, street_address, city, state, postal_code
//
// `owner_id` and the timestamps are set by the action/DB, never
// by the form, so they are not in the form schemas.

import * as z from 'zod'

const trimmedNonEmpty = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} is required.` })

// `year_built` arrives as a string from FormData; coerce and validate range.
const yearBuilt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine(
    (v) => v === undefined || (Number.isInteger(v) && v >= 1600 && v <= 2100),
    { error: 'Year built must be a valid year between 1600 and 2100.' },
  )

// Optional free-text fields collapse empty string to undefined for
// cleaner inserts (so the DB stores NULL, not '').
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

export const PropertyCreateSchema = z.object({
  name: trimmedNonEmpty('Name', 2),
  street_address: trimmedNonEmpty('Street address'),
  city: trimmedNonEmpty('City'),
  state: trimmedNonEmpty('State'),
  postal_code: trimmedNonEmpty('Postal code'),
  country: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? 'US' : v)),
  property_type: optionalText,
  year_built: yearBuilt,
  notes: optionalText,
})

// Update uses the same shape — every field is re-validated on edit.
export const PropertyUpdateSchema = PropertyCreateSchema

export type PropertyCreateInput = z.infer<typeof PropertyCreateSchema>
export type PropertyUpdateInput = z.infer<typeof PropertyUpdateSchema>

// Database row shape (what Supabase returns on select).
export type Property = {
  id: string
  owner_id: string
  name: string
  street_address: string
  city: string
  state: string
  postal_code: string
  country: string
  property_type: string | null
  year_built: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
