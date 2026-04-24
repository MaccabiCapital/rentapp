// ============================================================
// Leasing assistant LLM service — STUBBED
// ============================================================
//
// This file is the single call site for the LLM integration.
// Today it returns a deterministic canned response explaining
// that the AI is not configured. When the landlord picks and
// pays for an LLM provider (Anthropic Claude API / OpenAI /
// Retell AI / etc.) we swap `generateDraftReply` for a real
// client call. No other code changes needed.
//
// The feature flag is read from env: `LEASING_ASSISTANT_ENABLED`.
// If the flag is off OR no provider is configured, the stub
// returns the canned response. Every response goes through the
// fair-housing outbound scanner before it's returned.

import {
  LEASING_ASSISTANT_SYSTEM_PROMPT,
  outboundFlagsFor,
  type GuardrailFlags,
} from './fair-housing-guardrails'

export type DraftRequest = {
  conversationHistory: Array<{
    author: 'prospect' | 'landlord' | 'ai'
    direction: 'inbound' | 'outbound_draft' | 'outbound_sent'
    content: string
  }>
  prospectName: string | null
  listingContext: {
    propertyName: string | null
    unitLabel: string | null
    monthlyRent: number | null
    bedrooms: number | null
    bathrooms: number | null
  } | null
  customSystemPrompt: string | null
}

export type DraftResult = {
  content: string
  guardrailFlags: GuardrailFlags
  // If true, the reply came from a live LLM. If false, it's
  // the stub canned response and the user should know.
  isLive: boolean
}

function isEnabled(): boolean {
  // Never enable in stub mode — flip to true when the real
  // provider is wired up.
  return process.env.LEASING_ASSISTANT_ENABLED === 'true'
}

function buildSystemPrompt(custom: string | null): string {
  if (!custom || custom.trim() === '') return LEASING_ASSISTANT_SYSTEM_PROMPT
  return `${LEASING_ASSISTANT_SYSTEM_PROMPT}\n\nADDITIONAL LANDLORD PREFERENCES (applied AFTER the above, not instead):\n${custom.trim()}`
}

// ------------------------------------------------------------
// Stub response — used when no LLM provider is configured
// ------------------------------------------------------------

function stubResponse(req: DraftRequest): DraftResult {
  // Generate a contextually reasonable canned reply that makes
  // sense as a "first response" to a prospect, without making
  // any housing decisions or referencing protected classes.
  const propertyPart = req.listingContext?.propertyName
    ? ` about ${req.listingContext.propertyName}`
    : ''
  const content = `Thanks for reaching out${propertyPart}! I'll review your inquiry and follow up shortly with more details and next steps. If you'd like to speed things along, feel free to share any specific questions you have or let me know a few dates and times you'd be available to tour.`

  // Even the stub response goes through the outbound scanner
  // to demonstrate the flow and catch any future edits to the
  // template that might introduce issues.
  const flags = outboundFlagsFor(content)
  return { content, guardrailFlags: flags, isLive: false }
}

// ------------------------------------------------------------
// Real LLM integration — LEFT AS A STUB
// ------------------------------------------------------------
//
// When activating:
//   1. `npm i @anthropic-ai/sdk` (or provider of choice)
//   2. Set ANTHROPIC_API_KEY + LEASING_ASSISTANT_ENABLED=true
//   3. Implement this function against the SDK.
//   4. Keep the fair-housing system prompt prefix intact.
//   5. Keep the outbound scan — do NOT skip it even for a
//      trusted LLM; models drift.
//
// The shape of the return value is unchanged whether stub or
// live, so callers don't need to know.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function liveLlmDraft(_req: DraftRequest): Promise<DraftResult> {
  // TODO: implement against Anthropic SDK or chosen provider.
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  // const systemPrompt = buildSystemPrompt(_req.customSystemPrompt)
  // const messages = _req.conversationHistory.map(m => ({
  //   role: m.direction === 'inbound' ? 'user' : 'assistant',
  //   content: m.content,
  // }))
  // const result = await client.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   system: systemPrompt,
  //   messages,
  //   max_tokens: 400,
  // })
  // const content = extractText(result)
  // const flags = outboundFlagsFor(content)
  // return { content, guardrailFlags: flags, isLive: true }

  throw new Error(
    'Live LLM integration not implemented yet. Set LEASING_ASSISTANT_ENABLED=false or implement liveLlmDraft().',
  )
}

// ------------------------------------------------------------
// Public entrypoint
// ------------------------------------------------------------

export async function generateDraftReply(
  req: DraftRequest,
): Promise<DraftResult> {
  if (!isEnabled()) {
    return stubResponse(req)
  }
  try {
    return await liveLlmDraft(req)
  } catch (err) {
    console.error('Live LLM call failed, falling back to stub:', err)
    return stubResponse(req)
  }
}

// Useful helper so callers can show "Powered by [provider]" or
// "Stub mode — configure API key to enable" in the UI.
export function getAssistantMode(): 'stub' | 'live' {
  return isEnabled() ? 'live' : 'stub'
}

// Re-export system prompt so it's visible in settings UI.
export { LEASING_ASSISTANT_SYSTEM_PROMPT, buildSystemPrompt }
