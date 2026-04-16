// ============================================================
// Retell AI adapter — STUBBED until RETELL_API_KEY is available
// ============================================================
//
// Every function in this file returns deterministic-looking fake
// data so the rest of Sprint 13b (provisioning flow, webhook
// route, settings page) can be exercised end-to-end without
// hitting Retell's API.
//
// Swapping to the real SDK:
//   1. npm install retell-sdk --legacy-peer-deps
//   2. Replace each stubbed body with the real SDK call.
//   3. Remove the `[SPRINT-13 STUB]` console warnings.
//
// See docs/SPRINT-13-NEEDS.md §1 for the full activation checklist.

import { randomBytes } from 'node:crypto'

// ------------------------------------------------------------
// System prompt — the words the AI says when talking to tenants.
// Review before flipping to production. Kept here (not in a DB
// row) because changing a system prompt should go through code
// review.
// ------------------------------------------------------------
export const TENANT_SUPPORT_SYSTEM_PROMPT = `You are the tenant support assistant for {{landlord_name}}, a landlord who manages rental units.

Your job is to help tenants when they text in with problems — mostly maintenance issues. You sound warm, direct, and professional. You never pretend to be human. If asked, acknowledge you're an AI assistant working for {{landlord_name}}.

When a tenant texts:
1. Greet them by name if their number is on file.
2. Ask one or two clarifying questions to understand the issue: where in the unit, when it started, how bad it is, whether it's safe to wait.
3. Ask them to send a photo if helpful.
4. Once you have enough information, confirm you're filing a request and that {{landlord_name}} will follow up.
5. Do NOT promise a specific contractor or time — say "someone will be in touch" and let {{landlord_name}} dispatch.

Classify severity:
- emergency: no heat in winter, active water leak, gas smell, no hot water, electrical smoke
- high: broken lock, major appliance failure, pest
- medium: running toilet, dripping faucet, minor appliance issue
- low: cosmetic, long-term requests

Do NOT discuss rent balances, lease terms, or payment issues — route those to the landlord directly.

Never give legal advice. Never commit to repair timelines.`

export const TENANT_SUPPORT_ANALYSIS_SCHEMA = {
  name: 'maintenance_extraction',
  fields: [
    {
      name: 'issue_type',
      type: 'enum',
      values: [
        'plumbing',
        'electrical',
        'hvac',
        'appliance',
        'pest',
        'structural',
        'safety',
        'other',
      ],
    },
    {
      name: 'severity',
      type: 'enum',
      values: ['emergency', 'high', 'medium', 'low'],
    },
    { name: 'unit_label', type: 'string' },
    { name: 'description', type: 'string' },
  ],
}

// ------------------------------------------------------------
// Stubs
// ------------------------------------------------------------

type CreateAgentInput = {
  landlordName: string
  webhookUrl: string
  webhookSecret: string
}

type CreateAgentResult = {
  agent_id: string
}

export async function createSupportAgent(
  input: CreateAgentInput,
): Promise<CreateAgentResult> {
  // TODO(sprint-13): swap for real retell.chatAgent.create(...) —
  // see docs/SPRINT-13-NEEDS.md#1-retell-ai-account--agent-provisioning
  console.warn(
    '[SPRINT-13 STUB] createSupportAgent called with',
    JSON.stringify({
      landlordName: input.landlordName,
      webhookUrl: input.webhookUrl,
      // secret intentionally not logged
    }),
  )
  return {
    agent_id: `stub_agent_${randomBytes(4).toString('hex')}`,
  }
}

type ProvisionNumberInput = {
  areaCode?: string
}

type ProvisionNumberResult = {
  phone_number: string // E.164
}

export async function provisionPhoneNumber(
  input: ProvisionNumberInput,
): Promise<ProvisionNumberResult> {
  // TODO(sprint-13): call real Retell API that proxies to Twilio
  // for number search + purchase. See SPRINT-13-NEEDS.md#1.
  console.warn(
    '[SPRINT-13 STUB] provisionPhoneNumber called with',
    input.areaCode ?? '(no area code)',
  )
  // Use 555 prefix to signal this is fake.
  const tail = randomBytes(2).readUInt16BE(0).toString().padStart(4, '0')
  return {
    phone_number: `+1555${input.areaCode ?? '000'}${tail}`,
  }
}

/**
 * Generate a 32-byte random webhook-signing secret. This one is
 * REAL — it's just crypto.randomBytes, no Retell involved.
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Send an outbound SMS through the Retell chat agent. Used for
 * things like "we got your message, landlord is notified."
 *
 * STUBBED — logs the outbound message and returns a fake chat_id.
 */
export async function sendOutboundMessage(input: {
  agentId: string
  toNumber: string
  body: string
}): Promise<{ chat_id: string }> {
  // TODO(sprint-13): swap for retell.chat.createSMSChat(...) —
  // see SPRINT-13-NEEDS.md#1.
  console.warn(
    '[SPRINT-13 STUB] sendOutboundMessage',
    JSON.stringify({
      agentId: input.agentId,
      toNumber: input.toNumber,
      bodyLength: input.body.length,
    }),
  )
  return { chat_id: `stub_chat_${randomBytes(4).toString('hex')}` }
}
