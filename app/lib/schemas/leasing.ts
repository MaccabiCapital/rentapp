// ============================================================
// Leasing conversation validation schemas + shared types
// ============================================================

import * as z from 'zod'
import type { GuardrailFlags } from '@/app/lib/leasing/fair-housing-guardrails'

// ------------------------------------------------------------
// Enums
// ------------------------------------------------------------

export const CONVERSATION_STATUS_VALUES = [
  'active',
  'archived',
  'closed_won',
  'closed_lost',
] as const
export type ConversationStatus = (typeof CONVERSATION_STATUS_VALUES)[number]
export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  closed_won: 'Signed — won',
  closed_lost: 'Closed — lost',
}

export const MESSAGE_DIRECTION_VALUES = [
  'inbound',
  'outbound_draft',
  'outbound_sent',
] as const
export type MessageDirection = (typeof MESSAGE_DIRECTION_VALUES)[number]

export const MESSAGE_AUTHOR_VALUES = [
  'prospect',
  'landlord',
  'ai',
] as const
export type MessageAuthor = (typeof MESSAGE_AUTHOR_VALUES)[number]

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
// Create / update schemas
// ------------------------------------------------------------

export const ConversationCreateSchema = z.object({
  prospect_id: optionalUuid,
  listing_id: optionalUuid,
  prospect_name: optionalText,
  prospect_contact: optionalText,
  initial_message: optionalText, // inbound message to seed the thread
  custom_system_prompt: optionalText,
})
export type ConversationCreateInput = z.infer<typeof ConversationCreateSchema>

export const ConversationUpdateSchema = z.object({
  status: z.enum(CONVERSATION_STATUS_VALUES),
  custom_system_prompt: optionalText,
})
export type ConversationUpdateInput = z.infer<typeof ConversationUpdateSchema>

export const InboundMessageCreateSchema = z.object({
  conversation_id: z.string().trim().uuid(),
  content: trimmedRequired('Message'),
})
export type InboundMessageCreateInput = z.infer<
  typeof InboundMessageCreateSchema
>

export const OutboundMessageSendSchema = z.object({
  conversation_id: z.string().trim().uuid(),
  content: trimmedRequired('Message'),
  draft_id: optionalUuid, // when sending an approved AI draft
  confirm_guardrail_override: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
})
export type OutboundMessageSendInput = z.infer<
  typeof OutboundMessageSendSchema
>

// ------------------------------------------------------------
// DB row shapes
// ------------------------------------------------------------

export type LeasingConversation = {
  id: string
  owner_id: string
  prospect_id: string | null
  listing_id: string | null
  prospect_name: string | null
  prospect_contact: string | null
  status: ConversationStatus
  custom_system_prompt: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type LeasingMessage = {
  id: string
  conversation_id: string
  direction: MessageDirection
  author: MessageAuthor
  content: string
  guardrail_flags: GuardrailFlags
  approved_by_landlord_at: string | null
  edited_by_landlord: boolean
  created_at: string
}
