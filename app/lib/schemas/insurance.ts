// ============================================================
// Insurance policy validation schemas
// ============================================================
//
// Mirrors public.insurance_policies in db/schema.sql. A single
// policy can cover 1..N properties via the policy_properties
// junction — umbrella and bundled policies live cleanly without
// duplicated rows. The form sends property_ids as a multi-select
// and the server action re-syncs the junction after an update.

import * as z from 'zod'

export const POLICY_TYPE_VALUES = [
  'landlord',
  'umbrella',
  'flood',
  'earthquake',
  'rent_loss',
  'other',
] as const

export type PolicyType = (typeof POLICY_TYPE_VALUES)[number]

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  landlord: 'Landlord (dwelling + liability)',
  umbrella: 'Umbrella (excess liability)',
  flood: 'Flood',
  earthquake: 'Earthquake',
  rent_loss: 'Rent loss / business interruption',
  other: 'Other',
}

// ------------------------------------------------------------
// Helpers
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

const requiredDate = z
  .string()
  .trim()
  .min(1, { error: 'Expiry date is required.' })
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
    error: 'Use a YYYY-MM-DD date.',
  })

const checkboxBool = z
  .string()
  .optional()
  .transform((v) => v === 'on' || v === 'true')

// Form sends property_ids as repeated checkbox inputs. FormData
// coerces to either a string or array of strings depending on how
// many were selected. Zod preprocesses to always get an array.
const propertyIdsField = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x)
    if (typeof v === 'string' && v) return [v]
    return []
  },
  z.array(z.string().uuid({ error: 'Invalid property id.' })),
)

// ------------------------------------------------------------
// Schemas
// ------------------------------------------------------------

const baseFields = {
  carrier: trimmedRequired('Carrier', 2),
  policy_number: optionalText,
  policy_type: z.enum(POLICY_TYPE_VALUES, {
    error: 'Pick a valid policy type.',
  }),
  coverage_amount: optionalPositiveDecimal,
  liability_limit: optionalPositiveDecimal,
  annual_premium: optionalPositiveDecimal,
  deductible: optionalPositiveDecimal,
  effective_date: optionalDate,
  expiry_date: requiredDate,
  renewal_date: optionalDate,
  auto_renewal: checkboxBool,
  team_member_id: optionalText,
  notes: optionalText,
  document_url: optionalText,
  property_ids: propertyIdsField,
}

export const InsuranceCreateSchema = z.object(baseFields)
export const InsuranceUpdateSchema = z.object(baseFields)

export type InsuranceCreateInput = z.infer<typeof InsuranceCreateSchema>
export type InsuranceUpdateInput = z.infer<typeof InsuranceUpdateSchema>

// ------------------------------------------------------------
// Database row shape
// ------------------------------------------------------------

export type InsurancePolicy = {
  id: string
  owner_id: string
  team_member_id: string | null
  carrier: string
  policy_number: string | null
  policy_type: PolicyType
  coverage_amount: number | null
  liability_limit: number | null
  annual_premium: number | null
  deductible: number | null
  effective_date: string | null
  expiry_date: string
  renewal_date: string | null
  auto_renewal: boolean
  notes: string | null
  document_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Policy augmented with the property rows it covers. The detail
// page and list badge rely on this shape — the junction is hydrated
// by the queries layer, not at the database level.
export type InsurancePolicyWithProperties = InsurancePolicy & {
  properties: Array<{ id: string; name: string }>
}

// ------------------------------------------------------------
// Expiry/freshness helpers — used by the upcoming-events feed
// and the list badge.
// ------------------------------------------------------------

export type ExpirySeverity = 'expired' | 'urgent' | 'warning' | 'ok'

export function getExpirySeverity(
  expiryDateIso: string,
  nowMs: number,
): { severity: ExpirySeverity; days: number } {
  const expiryMs = new Date(expiryDateIso).getTime()
  const days = Math.floor((expiryMs - nowMs) / (1000 * 60 * 60 * 24))
  if (days < 0) return { severity: 'expired', days }
  if (days <= 14) return { severity: 'urgent', days }
  if (days <= 60) return { severity: 'warning', days }
  return { severity: 'ok', days }
}
