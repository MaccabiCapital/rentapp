// ============================================================
// Retell webhook payload schemas (Zod)
// ============================================================
//
// These schemas parse inbound webhook JSON into known-good shapes
// before the route handler acts on them. The field list is drawn
// from Retell's public docs and NEEDS to be re-checked against a
// live payload before flipping to production — see
// docs/SPRINT-13-NEEDS.md §6.

import * as z from 'zod'

// post_chat_analysis_data fields we extract. Retell's LLM is
// instructed (via TENANT_SUPPORT_ANALYSIS_SCHEMA in retell-adapter)
// to populate these from the conversation. Everything is optional
// because the AI won't always land all fields.
export const RetellAnalysisSchema = z.object({
  issue_type: z
    .enum([
      'plumbing',
      'electrical',
      'hvac',
      'appliance',
      'pest',
      'structural',
      'safety',
      'other',
    ])
    .optional(),
  severity: z.enum(['emergency', 'high', 'medium', 'low']).optional(),
  unit_label: z.string().optional(),
  description: z.string().optional(),
})

export type RetellAnalysis = z.infer<typeof RetellAnalysisSchema>

// A single message in the conversation transcript.
export const RetellMessageSchema = z.object({
  role: z.enum(['user', 'agent']),
  content: z.string(),
  // Twilio media URLs when the tenant attached an MMS.
  media_urls: z.array(z.string().url()).optional().default([]),
})

export type RetellMessage = z.infer<typeof RetellMessageSchema>

// Base event shape shared by all webhook event types.
const baseChatEventFields = {
  event: z.string(), // 'chat_started' | 'chat_ended' | 'chat_analyzed'
  chat_id: z.string(),
  agent_id: z.string(),
  from_number: z.string(),
  to_number: z.string(),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
}

export const RetellChatStartedSchema = z.object({
  ...baseChatEventFields,
  event: z.literal('chat_started'),
  initial_message: z.string().optional(),
})

export const RetellChatEndedSchema = z.object({
  ...baseChatEventFields,
  event: z.literal('chat_ended'),
  messages: z.array(RetellMessageSchema).default([]),
})

export const RetellChatAnalyzedSchema = z.object({
  ...baseChatEventFields,
  event: z.literal('chat_analyzed'),
  messages: z.array(RetellMessageSchema).default([]),
  post_chat_analysis_data: RetellAnalysisSchema.optional(),
})

// Discriminated union of every event we care about.
export const RetellWebhookEventSchema = z.discriminatedUnion('event', [
  RetellChatStartedSchema,
  RetellChatEndedSchema,
  RetellChatAnalyzedSchema,
])

export type RetellChatStarted = z.infer<typeof RetellChatStartedSchema>
export type RetellChatEnded = z.infer<typeof RetellChatEndedSchema>
export type RetellChatAnalyzed = z.infer<typeof RetellChatAnalyzedSchema>
export type RetellWebhookEvent = z.infer<typeof RetellWebhookEventSchema>
