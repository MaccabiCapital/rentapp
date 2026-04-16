// ============================================================
// Communications (polymorphic activity log) schemas
// ============================================================
//
// Mirrors public.communications in db/schema.sql. One row per
// inbound/outbound interaction — SMS, call, email, note. The
// (entity_type, entity_id) pair points at any CRM-like entity.
//
// Sprint 13a ships with manual logging only. Sprint 13b adds the
// Retell webhook path that writes inbound SMS rows with
// created_by='webhook' and an external_id holding the chat_id.

import * as z from 'zod'

export const COMM_ENTITY_TYPE_VALUES = [
  'tenant',
  'prospect',
  'team_member',
  'maintenance_request',
  'lease',
  'triage',
] as const

export type CommEntityType = (typeof COMM_ENTITY_TYPE_VALUES)[number]

export const COMM_ENTITY_TYPE_LABELS: Record<CommEntityType, string> = {
  tenant: 'Tenant',
  prospect: 'Prospect',
  team_member: 'Team member',
  maintenance_request: 'Maintenance request',
  lease: 'Lease',
  triage: 'Triage',
}

export const COMM_DIRECTION_VALUES = ['inbound', 'outbound'] as const
export type CommDirection = (typeof COMM_DIRECTION_VALUES)[number]
export const COMM_DIRECTION_LABELS: Record<CommDirection, string> = {
  inbound: 'Received',
  outbound: 'Sent',
}

export const COMM_CHANNEL_VALUES = [
  'sms',
  'call',
  'email',
  'whatsapp',
  'note',
] as const
export type CommChannel = (typeof COMM_CHANNEL_VALUES)[number]
export const COMM_CHANNEL_LABELS: Record<CommChannel, string> = {
  sms: 'SMS',
  call: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  note: 'Note',
}

export const COMM_CHANNEL_ICONS: Record<CommChannel, string> = {
  sms: '✉',
  call: '☎',
  email: '@',
  whatsapp: '◎',
  note: '¶',
}

// ------------------------------------------------------------
// Form schema — used by the inline LogCommunicationForm.
// entity_type + entity_id are passed as hidden fields from the
// parent page; the user only picks direction + channel + content.
// ------------------------------------------------------------

const trimmedRequired = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} is required.` })

export const LogCommunicationSchema = z.object({
  entity_type: z.enum(COMM_ENTITY_TYPE_VALUES, {
    error: 'Invalid entity type.',
  }),
  entity_id: z.string().uuid({ error: 'Invalid entity id.' }),
  direction: z.enum(COMM_DIRECTION_VALUES, {
    error: 'Pick inbound or outbound.',
  }),
  channel: z.enum(COMM_CHANNEL_VALUES, { error: 'Pick a channel.' }),
  content: trimmedRequired('Content', 1),
})

export type LogCommunicationInput = z.infer<typeof LogCommunicationSchema>

// ------------------------------------------------------------
// Database row shape
// ------------------------------------------------------------

export type Communication = {
  id: string
  owner_id: string
  entity_type: CommEntityType
  entity_id: string
  direction: CommDirection
  channel: CommChannel
  content: string
  external_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  created_by: string
  deleted_at: string | null
}
