// ============================================================
// Tenant validation schemas
// ============================================================
//
// Mirrors `public.tenants` in db/schema.sql. `owner_id` is set
// by the server action from the JWT, not from the form.
//
// Email and phone are optional because some landlords track
// tenants who only communicate via post or in-person (real
// scenario, came up in research). Name fields are required.

import * as z from 'zod'

const trimmedNonEmpty = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} is required.` })

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

// Optional email: empty OK, but if present must parse.
const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { error: 'Please enter a valid email address.' },
  )

// Date-of-birth: ISO date string or empty. We don't validate
// "must be in the past" because landlords sometimes enter
// approximate birthdays or leave it blank.
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { error: 'Please use a YYYY-MM-DD date.' },
  )

export const TenantCreateSchema = z.object({
  first_name: trimmedNonEmpty('First name'),
  last_name: trimmedNonEmpty('Last name'),
  email: optionalEmail,
  phone: optionalText,
  date_of_birth: optionalDate,
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  notes: optionalText,
})

export const TenantUpdateSchema = TenantCreateSchema

export type TenantCreateInput = z.infer<typeof TenantCreateSchema>
export type TenantUpdateInput = z.infer<typeof TenantUpdateSchema>

export type Tenant = {
  id: string
  owner_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
