// ============================================================
// Renters (tenant) insurance validation schemas
// ============================================================
//
// Mirrors public.renters_insurance_policies. Landlord-side
// tracking of whether each tenant has a current renters-insurance
// policy on file. Separate from public.insurance_policies which
// handles LANDLORD policies (liability, umbrella, flood).

import * as z from 'zod'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const trimmedRequired = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })

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

const requiredDate = z
  .string()
  .trim()
  .min(1, { error: 'Expiry date is required.' })
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
    error: 'Use a YYYY-MM-DD date.',
  })

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) =>
      v === undefined ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    { error: 'Invalid identifier.' },
  )

// ------------------------------------------------------------
// Create / Update
// ------------------------------------------------------------

export const RentersInsuranceCreateSchema = z.object({
  tenant_id: z
    .string()
    .trim()
    .uuid({ error: 'Pick a tenant.' }),
  lease_id: optionalUuid,
  carrier: trimmedRequired('Carrier'),
  policy_number: optionalText,
  liability_coverage: optionalPositiveDecimal,
  personal_property_coverage: optionalPositiveDecimal,
  annual_premium: optionalPositiveDecimal,
  effective_date: optionalDate,
  expiry_date: requiredDate,
  document_url: optionalText,
  notes: optionalText,
})
export type RentersInsuranceCreateInput = z.infer<
  typeof RentersInsuranceCreateSchema
>

export const RentersInsuranceUpdateSchema = RentersInsuranceCreateSchema

// ------------------------------------------------------------
// DB row shape
// ------------------------------------------------------------

export type RentersInsurancePolicy = {
  id: string
  owner_id: string
  tenant_id: string
  lease_id: string | null
  carrier: string
  policy_number: string | null
  liability_coverage: number | null
  personal_property_coverage: number | null
  annual_premium: number | null
  effective_date: string | null
  expiry_date: string
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ------------------------------------------------------------
// Status helpers
// ------------------------------------------------------------

export type ExpiryStatus = 'expired' | 'expiring_soon' | 'ok'

export function getRentersInsuranceExpiryStatus(
  expiryDate: string,
  nowMs: number = Date.now(),
): { status: ExpiryStatus; days: number } {
  const exp = new Date(expiryDate).getTime()
  const days = Math.floor((exp - nowMs) / (1000 * 60 * 60 * 24))
  if (days < 0) return { status: 'expired', days }
  if (days <= 30) return { status: 'expiring_soon', days }
  return { status: 'ok', days }
}

export const EXPIRY_BADGE: Record<ExpiryStatus, string> = {
  expired: 'bg-red-100 text-red-800',
  expiring_soon: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-800',
}
