// ============================================================
// Prospect validation schemas
// ============================================================
//
// Mirrors `public.prospects` in db/schema.sql. The migration
// in Sprint 5 added `deleted_at` for soft-delete.
//
// Landlords typically don't know the prospect's full contact
// info up front — first_name + an email OR phone is enough.
// Schema enforces neither strictly, but the form requires at
// least one contact channel.

import * as z from 'zod'

export const PROSPECT_STAGE_VALUES = [
  'inquired',
  'application_sent',
  'application_received',
  'screening',
  'approved',
  'lease_signed',
  'declined',
  'withdrew',
] as const

export type ProspectStage = (typeof PROSPECT_STAGE_VALUES)[number]

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  inquired: 'Inquired',
  application_sent: 'App Sent',
  application_received: 'App Received',
  screening: 'Screening',
  approved: 'Approved',
  lease_signed: 'Lease Signed',
  declined: 'Declined',
  withdrew: 'Withdrew',
}

// Pipeline stages (flow top-to-bottom/left-to-right)
export const PIPELINE_STAGES: ProspectStage[] = [
  'inquired',
  'application_sent',
  'application_received',
  'screening',
  'approved',
  'lease_signed',
]

export const TERMINAL_STAGES: ProspectStage[] = ['declined', 'withdrew']

export const PROSPECT_SOURCES = [
  'zillow',
  'craigslist',
  'facebook_marketplace',
  'apartments_com',
  'referral',
  'walk_by',
  'landing_page',
  'other',
] as const

export type ProspectSource = (typeof PROSPECT_SOURCES)[number]

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  zillow: 'Zillow',
  craigslist: 'Craigslist',
  facebook_marketplace: 'Facebook Marketplace',
  apartments_com: 'Apartments.com',
  referral: 'Referral',
  walk_by: 'Walk-by / sign',
  landing_page: 'Landing page',
  other: 'Other',
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { error: 'Please enter a valid email address.' },
  )

const optionalDatetime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || !Number.isNaN(new Date(v).getTime()),
    { error: 'Please use a valid date.' },
  )

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) =>
      v === undefined ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        v,
      ),
    { error: 'Invalid unit id.' },
  )

const baseFields = {
  first_name: optionalText,
  last_name: optionalText,
  email: optionalEmail,
  phone: optionalText,
  stage: z
    .enum(PROSPECT_STAGE_VALUES, { error: 'Pick a valid stage.' })
    .default('inquired'),
  source: z
    .enum(PROSPECT_SOURCES, { error: 'Pick a valid source.' })
    .optional(),
  unit_id: optionalUuid,
  inquiry_message: optionalText,
  follow_up_at: optionalDatetime,
  notes: optionalText,
}

// Require at least one contact channel (email or phone) and at
// least a first name — landlords should not create empty shell
// prospects.
export const ProspectCreateSchema = z
  .object(baseFields)
  .refine((v) => (v.first_name ?? '').length > 0, {
    error: 'First name is required.',
    path: ['first_name'],
  })
  .refine((v) => (v.email ?? '').length > 0 || (v.phone ?? '').length > 0, {
    error: 'Provide an email or phone so you can follow up.',
    path: ['email'],
  })

export const ProspectUpdateSchema = ProspectCreateSchema

export type ProspectCreateInput = z.infer<typeof ProspectCreateSchema>
export type ProspectUpdateInput = z.infer<typeof ProspectUpdateSchema>

// Database row shape
export type Prospect = {
  id: string
  owner_id: string
  unit_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  stage: ProspectStage
  source: string | null
  inquiry_message: string | null
  follow_up_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  converted_to_tenant_id: string | null
}
