// ============================================================
// Inspection validation schemas
// ============================================================
//
// Mirrors public.inspections and public.inspection_items in
// db/migrations/2026_04_22_inspections.sql.
//
// Inspection = header (lease, type, dates, signatures, pdf_url).
// Inspection items = line rows per room/item with condition +
// notes + photos.
//
// The form for creating an inspection is minimal — pick a lease
// and type. We seed the starter checklist server-side from
// app/lib/inspection-templates.ts so the landlord lands on a
// pre-populated list of rooms and items to walk through.

import * as z from 'zod'

// ------------------------------------------------------------
// Enums
// ------------------------------------------------------------

export const INSPECTION_TYPE_VALUES = [
  'move_in',
  'move_out',
  'periodic',
] as const

export type InspectionType = (typeof INSPECTION_TYPE_VALUES)[number]

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  move_in: 'Move-in',
  move_out: 'Move-out',
  periodic: 'Periodic / walkthrough',
}

export const INSPECTION_STATUS_VALUES = [
  'draft',
  'in_progress',
  'completed',
  'signed',
] as const

export type InspectionStatus = (typeof INSPECTION_STATUS_VALUES)[number]

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  completed: 'Completed',
  signed: 'Signed',
}

export const ITEM_CONDITION_VALUES = [
  'excellent',
  'good',
  'fair',
  'poor',
  'damaged',
] as const

export type ItemCondition = (typeof ITEM_CONDITION_VALUES)[number]

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))
  .refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { error: 'Use a YYYY-MM-DD date.' },
  )

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

// ------------------------------------------------------------
// Create (header only — items are seeded server-side)
// ------------------------------------------------------------

export const InspectionCreateSchema = z.object({
  lease_id: z
    .string()
    .trim()
    .uuid({ error: 'Pick a lease.' }),
  type: z.enum(INSPECTION_TYPE_VALUES, {
    error: 'Pick an inspection type.',
  }),
  scheduled_for: optionalDate,
  notes: optionalText,
})

export type InspectionCreateInput = z.infer<typeof InspectionCreateSchema>

// ------------------------------------------------------------
// Update header
// ------------------------------------------------------------

export const InspectionUpdateSchema = z.object({
  type: z.enum(INSPECTION_TYPE_VALUES),
  scheduled_for: optionalDate,
  notes: optionalText,
})

export type InspectionUpdateInput = z.infer<typeof InspectionUpdateSchema>

// ------------------------------------------------------------
// Item create / update
// ------------------------------------------------------------

export const ItemCreateSchema = z.object({
  inspection_id: z.string().trim().uuid(),
  room: z.string().trim().min(1, { error: 'Room is required.' }),
  item: z.string().trim().min(1, { error: 'Item is required.' }),
  sort_order: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? 0 : Number(v)))
    .refine((v) => Number.isFinite(v) && v >= 0, {
      error: 'Sort order must be a non-negative number.',
    }),
})

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>

export const ItemUpdateSchema = z.object({
  room: z.string().trim().min(1, { error: 'Room is required.' }),
  item: z.string().trim().min(1, { error: 'Item is required.' }),
  condition: z
    .union([z.enum(ITEM_CONDITION_VALUES), z.literal('')])
    .optional()
    .transform((v) =>
      v === undefined || v === '' ? undefined : (v as ItemCondition),
    ),
  notes: optionalText,
})

export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>

// ------------------------------------------------------------
// Signature
// ------------------------------------------------------------

export const SignSchema = z.object({
  party: z.enum(['tenant', 'landlord']),
  name: z
    .string()
    .trim()
    .min(1, { error: 'Type your full name to sign.' }),
})

export type SignInput = z.infer<typeof SignSchema>

// ------------------------------------------------------------
// DB row shapes (what the queries return)
// ------------------------------------------------------------

export type Inspection = {
  id: string
  owner_id: string
  lease_id: string
  type: InspectionType
  status: InspectionStatus
  scheduled_for: string | null
  completed_at: string | null
  tenant_signed_at: string | null
  tenant_signature_name: string | null
  landlord_signed_at: string | null
  landlord_signature_name: string | null
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type InspectionItem = {
  id: string
  inspection_id: string
  room: string
  item: string
  condition: ItemCondition | null
  notes: string | null
  photos: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

// Display helpers
export const CONDITION_BADGE: Record<ItemCondition, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-emerald-50 text-emerald-700',
  fair: 'bg-amber-100 text-amber-800',
  poor: 'bg-orange-100 text-orange-800',
  damaged: 'bg-red-100 text-red-800',
}
