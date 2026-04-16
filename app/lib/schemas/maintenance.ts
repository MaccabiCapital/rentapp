// ============================================================
// Maintenance request validation schemas
// ============================================================
//
// Mirrors `public.maintenance_requests` in db/schema.sql.
// `owner_id`, `unit_id`, `tenant_id` are passed positionally or
// derived from the unit — not collected from the form.
//
// `photos` stays unused in Sprint 4; upload UI is deferred until
// a Supabase Storage bucket is configured (likely Sprint 4.5).

import * as z from 'zod'

export const MAINTENANCE_STATUS_VALUES = [
  'open',
  'assigned',
  'in_progress',
  'awaiting_parts',
  'resolved',
  'closed',
] as const

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS_VALUES)[number]

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_parts: 'Awaiting Parts',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const URGENCY_VALUES = ['low', 'normal', 'high', 'emergency'] as const
export type Urgency = (typeof URGENCY_VALUES)[number]
export const URGENCY_LABELS: Record<Urgency, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  emergency: 'Emergency',
}

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

const optionalPositiveDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    error: 'Must be a non-negative number.',
  })

// On create, tenant_id is optional because the landlord might be
// logging a vacancy issue (leak discovered during turnover, etc).
export const MaintenanceCreateSchema = z.object({
  title: trimmedNonEmpty('Title', 3),
  description: optionalText,
  urgency: z
    .enum(URGENCY_VALUES, { error: 'Pick a valid urgency.' })
    .default('normal'),
  status: z
    .enum(MAINTENANCE_STATUS_VALUES, { error: 'Pick a valid status.' })
    .default('open'),
  assigned_to: optionalText,
  tenant_id: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v))
    .refine(
      (v) =>
        v === undefined ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          v,
        ),
      { error: 'Invalid tenant id.' },
    ),
  notes: optionalText,
})

export const MaintenanceUpdateSchema = z.object({
  title: trimmedNonEmpty('Title', 3),
  description: optionalText,
  urgency: z.enum(URGENCY_VALUES, { error: 'Pick a valid urgency.' }),
  status: z.enum(MAINTENANCE_STATUS_VALUES, {
    error: 'Pick a valid status.',
  }),
  assigned_to: optionalText,
  cost_materials: optionalPositiveDecimal,
  cost_labor: optionalPositiveDecimal,
  notes: optionalText,
})

export type MaintenanceCreateInput = z.infer<typeof MaintenanceCreateSchema>
export type MaintenanceUpdateInput = z.infer<typeof MaintenanceUpdateSchema>

// Database row shape.
export type MaintenanceRequest = {
  id: string
  owner_id: string
  unit_id: string
  tenant_id: string | null
  title: string
  description: string | null
  urgency: Urgency
  status: MaintenanceStatus
  photos: string[]
  assigned_to: string | null
  cost_materials: number | null
  cost_labor: number | null
  resolved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
