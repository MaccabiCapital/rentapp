// ============================================================
// Listing validation schemas + slug helper
// ============================================================

import * as z from 'zod'

// ------------------------------------------------------------
// Slug generation
// ------------------------------------------------------------
// Takes "42 Elm Street · Unit 1" and returns "42-elm-street-unit-1".
// Uniqueness is enforced by the DB unique index on slug. If a
// collision happens, the createListing action catches the error
// and appends -2, -3 etc.

export function buildSlug(source: string, suffix?: string | number): string {
  const base = source
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip punctuation
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-|-$/g, '') // trim leading/trailing dashes
    .slice(0, 60) // cap length
  if (suffix !== undefined) return `${base}-${suffix}`
  return base
}

// ------------------------------------------------------------
// Form schemas
// ------------------------------------------------------------

const trimmedRequired = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} is required.` })

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const optionalPositiveDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    error: 'Must be a non-negative number.',
  })

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { error: 'Use a YYYY-MM-DD date.' },
  )

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { error: 'Please enter a valid email address.' },
  )

// Landlord-side: create/edit a listing
export const ListingCreateSchema = z.object({
  property_id: trimmedRequired('Property'),
  unit_id: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
  title: trimmedRequired('Title', 3),
  description: optionalText,
  headline_rent: optionalPositiveDecimal,
  available_on: optionalDate,
  contact_email: optionalEmail,
  contact_phone: optionalText,
  is_active: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
})

export const ListingUpdateSchema = ListingCreateSchema

export type ListingCreateInput = z.infer<typeof ListingCreateSchema>
export type ListingUpdateInput = z.infer<typeof ListingUpdateSchema>

// ------------------------------------------------------------
// Public side: inquiry submission from /listings/[slug]
// ------------------------------------------------------------

export const ListingInquirySchema = z.object({
  slug: trimmedRequired('Listing slug'),
  first_name: trimmedRequired('First name', 2),
  last_name: optionalText,
  email: z.email({ error: 'Please enter a valid email address.' }),
  phone: optionalText,
  message: optionalText,
  // Cloudflare Turnstile response token
  cfTurnstileResponse: trimmedRequired('Captcha verification'),
  // Honeypot field — bots fill it in, humans leave it blank.
  // If non-empty, silently reject (no error surfaced to the bot).
  website: optionalText,
})

export type ListingInquiryInput = z.infer<typeof ListingInquirySchema>

// ------------------------------------------------------------
// Database row shape
// ------------------------------------------------------------

export type Listing = {
  id: string
  owner_id: string
  property_id: string
  unit_id: string | null
  slug: string
  title: string
  description: string | null
  headline_rent: number | null
  available_on: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  view_count: number
  inquiry_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
