// ============================================================
// Company profile schema (extends landlord_settings)
// ============================================================
//
// Companion to db/migrations/2026_04_26_company_profile.sql.
// One row per landlord, keyed by owner_id (PK on landlord_settings).

import * as z from 'zod'

export type CompanyProfile = {
  owner_id: string
  // Branding
  company_name: string | null
  logo_storage_path: string | null
  brand_color: string | null
  website: string | null
  // Contact
  business_email: string | null
  business_phone: string | null
  business_street_address: string | null
  business_unit: string | null
  business_city: string | null
  business_state: string | null
  business_postal_code: string | null
  // Defaults
  default_notice_period_days: number | null
  default_late_fee_amount: number | null
  default_grace_period_days: number | null
  default_pet_policy: string | null
  business_hours: string | null
  quiet_hours: string | null
  emergency_contact: string | null
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const optionalIntPositive = z
  .string()
  .trim()
  .optional()
  .transform((v) =>
    v === undefined || v === '' ? null : Number(v),
  )
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), {
    error: 'Must be a non-negative integer.',
  })

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v) =>
    v === undefined || v === '' ? null : Number(v),
  )
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
    error: 'Must be zero or greater.',
  })

const hexColor = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^#[0-9a-fA-F]{6}$/.test(v),
    { error: 'Use a 6-digit hex color like #4f46e5.' },
  )

export const CompanyProfileUpsertSchema = z.object({
  // Branding
  company_name: optionalText,
  brand_color: hexColor,
  website: optionalText,
  // Contact
  business_email: optionalText,
  business_phone: optionalText,
  business_street_address: optionalText,
  business_unit: optionalText,
  business_city: optionalText,
  business_state: optionalText,
  business_postal_code: optionalText,
  // Defaults
  default_notice_period_days: optionalIntPositive,
  default_late_fee_amount: optionalMoney,
  default_grace_period_days: optionalIntPositive,
  default_pet_policy: optionalText,
  business_hours: optionalText,
  quiet_hours: optionalText,
  emergency_contact: optionalText,
})

export type CompanyProfileUpsertInput = z.infer<
  typeof CompanyProfileUpsertSchema
>
