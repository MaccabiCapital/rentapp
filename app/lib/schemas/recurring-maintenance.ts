// ============================================================
// Recurring maintenance schemas
// ============================================================

import * as z from 'zod'

export const FREQUENCY_UNIT_VALUES = [
  'days',
  'weeks',
  'months',
  'years',
] as const
export type FrequencyUnit = (typeof FREQUENCY_UNIT_VALUES)[number]

export const FREQUENCY_UNIT_LABELS: Record<FrequencyUnit, string> = {
  days: 'days',
  weeks: 'weeks',
  months: 'months',
  years: 'years',
}

export const TASK_STATUS_VALUES = ['active', 'paused', 'archived'] as const
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-zinc-100 text-zinc-700',
  archived: 'bg-zinc-100 text-zinc-500',
}

export const COMMON_CATEGORIES = [
  { value: 'hvac', label: 'HVAC service' },
  { value: 'smoke_detector', label: 'Smoke detector / batteries' },
  { value: 'pest', label: 'Pest control' },
  { value: 'plumbing', label: 'Plumbing (water heater flush, etc.)' },
  { value: 'exterior', label: 'Exterior (gutters, roof, paint)' },
  { value: 'safety', label: 'Safety (fire extinguisher, CO detector)' },
  { value: 'other', label: 'Other' },
] as const

export type RecurringMaintenanceTask = {
  id: string
  owner_id: string
  property_id: string | null
  unit_id: string | null
  title: string
  description: string | null
  category: string | null
  frequency_value: number
  frequency_unit: FrequencyUnit
  next_due_date: string
  lead_time_days: number
  last_completed_at: string | null
  last_completed_notes: string | null
  vendor_name: string | null
  vendor_phone: string | null
  vendor_email: string | null
  status: TaskStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MaintenanceCompletion = {
  id: string
  owner_id: string
  task_id: string
  completed_on: string
  notes: string | null
  cost_cents: number | null
  vendor_used: string | null
  created_at: string
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const requiredDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
    error: 'Use a YYYY-MM-DD date.',
  })

export const TaskUpsertSchema = z
  .object({
    scope: z.enum(['property', 'unit']),
    property_id: optionalText,
    unit_id: optionalText,
    title: z
      .string()
      .trim()
      .min(1, { error: 'Title is required.' })
      .max(200),
    description: optionalText,
    category: optionalText,
    frequency_value: z
      .string()
      .trim()
      .transform((v) => Number(v))
      .refine((v) => Number.isInteger(v) && v > 0, {
        error: 'Must be a positive integer.',
      }),
    frequency_unit: z.enum(FREQUENCY_UNIT_VALUES, {
      error: 'Pick a frequency.',
    }),
    next_due_date: requiredDate,
    lead_time_days: z
      .string()
      .trim()
      .optional()
      .transform((v) =>
        v === undefined || v === '' ? 14 : Number(v),
      )
      .refine((v) => Number.isInteger(v) && v >= 0 && v <= 365, {
        error: 'Lead time must be between 0 and 365 days.',
      }),
    vendor_name: optionalText,
    vendor_phone: optionalText,
    vendor_email: optionalText,
  })
  .refine(
    (v) =>
      (v.scope === 'property' && !!v.property_id) ||
      (v.scope === 'unit' && !!v.unit_id),
    { error: 'Pick a property or unit for the task.' },
  )

export type TaskUpsertInput = z.infer<typeof TaskUpsertSchema>

export const CompleteTaskSchema = z.object({
  completed_on: requiredDate,
  notes: optionalText,
  cost_cents: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      v === undefined || v === '' ? null : Math.round(Number(v) * 100),
    )
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      error: 'Cost must be zero or greater.',
    }),
  vendor_used: optionalText,
})
export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>

// Add days/weeks/months/years to a YYYY-MM-DD date and return YYYY-MM-DD.
export function advanceDate(
  isoDate: string,
  value: number,
  unit: FrequencyUnit,
): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  if (unit === 'days') d.setUTCDate(d.getUTCDate() + value)
  else if (unit === 'weeks') d.setUTCDate(d.getUTCDate() + value * 7)
  else if (unit === 'months') d.setUTCMonth(d.getUTCMonth() + value)
  else if (unit === 'years') d.setUTCFullYear(d.getUTCFullYear() + value)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(isoDate: string): number {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00Z')
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
