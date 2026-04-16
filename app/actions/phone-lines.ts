'use server'

// ============================================================
// Phone-line provisioning server actions
// ============================================================
//
// provisionSupportLine() is the button behind the SMS settings
// page. Today it writes a pending row with stub Retell/Twilio IDs.
// Swap the three stubbed adapter calls for real SDK calls when
// RETELL_API_KEY is available — see docs/SPRINT-13-NEEDS.md.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  createSupportAgent,
  generateWebhookSecret,
  provisionPhoneNumber,
} from '@/app/lib/sms/retell-adapter'
// rotateWebhookSecret below intentionally doesn't call
// generateWebhookSecret yet — see review H-2 / the TODO in that function.
import type { ActionState } from '@/app/lib/types'

function getBaseUrl(): string {
  // Used to build the webhook URL we tell Retell to POST to.
  // Local dev needs an HTTPS tunnel (ngrok, cloudflared) pointed at
  // localhost. TODO(sprint-13): document this in SPRINT-13-NEEDS.md
  // once we test with a live Retell agent.
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000'
  )
}

export async function provisionSupportLine(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // One support line per landlord. If they already have one,
  // return success without reprovisioning.
  const { data: existing } = await supabase
    .from('landlord_phone_lines')
    .select('id')
    .eq('line_type', 'support')
    .maybeSingle()
  if (existing) {
    return {
      success: false,
      message: 'You already have a support line set up.',
    }
  }

  const landlordName =
    (user.user_metadata?.full_name as string | undefined) ?? 'your landlord'
  const webhookSecret = generateWebhookSecret()
  const webhookUrl = `${getBaseUrl()}/api/webhooks/retell/${user.id}`

  // These two are stubbed — see retell-adapter.ts. Partial-failure
  // rollback becomes relevant once they're real: if agent creation
  // succeeds but number provisioning fails, delete the agent before
  // returning. TODO(sprint-13).
  const { agent_id } = await createSupportAgent({
    landlordName,
    webhookUrl,
    webhookSecret,
  })
  const { phone_number } = await provisionPhoneNumber({})

  const { error } = await supabase.from('landlord_phone_lines').insert({
    owner_id: user.id,
    line_type: 'support',
    twilio_number: phone_number,
    retell_agent_id: agent_id,
    retell_webhook_secret: webhookSecret,
    // Real flow leaves this as 'pending' until A2P 10DLC clears.
    // Stub flow flips to 'active' so the UI looks live for demos.
    status: 'active',
  })
  if (error) {
    return {
      success: false,
      message: `Could not save the support line: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/settings/sms')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function suspendSupportLine(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }
  const { error } = await supabase
    .from('landlord_phone_lines')
    .update({ status: 'suspended' })
    .eq('owner_id', user.id) // defense in depth (review L-2)
    .eq('line_type', 'support')
  if (error) {
    return { success: false, message: `Could not suspend: ${error.message}` }
  }
  revalidatePath('/dashboard/settings/sms')
  return { success: true }
}

export async function rotateWebhookSecret(): Promise<ActionState> {
  // DISABLED until the Retell update-agent API call is wired in.
  // Rotating the secret in our DB without simultaneously telling
  // Retell about the new secret silently breaks webhook
  // verification for every inbound message after the rotation.
  // See review H-2 and docs/SPRINT-13-NEEDS.md#1.
  //
  // When re-enabling:
  //   1. Call retell.chatAgent.update({ agent_id, webhook_secret })
  //      atomically with the DB write.
  //   2. Roll back the DB change if Retell returns an error.
  //   3. Remove this guard.
  // TODO(sprint-13)
  return {
    success: false,
    message:
      'Secret rotation is disabled until the Retell update-agent API is wired in — see SPRINT-13-NEEDS.md.',
  }
}
