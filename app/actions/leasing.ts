'use server'

// ============================================================
// Leasing conversation server actions
// ============================================================
//
// Workflow:
//   1. createConversation — seeds optional inbound message
//   2. addInboundMessage — paste a new prospect reply
//   3. generateDraft — invoke the stubbed (or live) LLM service
//   4. sendOutboundMessage — approve + mark sent (optionally
//      with inline edits, which sets edited_by_landlord=true)
//   5. discardDraft — delete a draft outbound message
//   6. updateConversation — change status / custom prompt
//   7. deleteConversation — soft-delete

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  ConversationCreateSchema,
  ConversationUpdateSchema,
  InboundMessageCreateSchema,
  OutboundMessageSendSchema,
} from '@/app/lib/schemas/leasing'
import {
  inboundFlagsFor,
  outboundFlagsFor,
} from '@/app/lib/leasing/fair-housing-guardrails'
import { generateDraftReply } from '@/app/lib/leasing/assistant-service'
import type { ActionState } from '@/app/lib/types'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyOwnsConversation(supabase: any, id: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('leasing_conversations')
    .select('id')
    .eq('id', id)
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  return !!data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function touchConversation(supabase: any, id: string) {
  await supabase
    .from('leasing_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', id)
}

// ------------------------------------------------------------
// Create conversation
// ------------------------------------------------------------

export async function createConversation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ConversationCreateSchema.safeParse({
    prospect_id: formData.get('prospect_id'),
    listing_id: formData.get('listing_id'),
    prospect_name: formData.get('prospect_name'),
    prospect_contact: formData.get('prospect_contact'),
    initial_message: formData.get('initial_message'),
    custom_system_prompt: formData.get('custom_system_prompt'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  // Require either a prospect_id or a free-form prospect_name
  if (!parsed.data.prospect_id && !parsed.data.prospect_name) {
    return {
      success: false,
      errors: {
        prospect_name: ['Pick a prospect or enter a name for this conversation.'],
      },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { data: created, error } = await supabase
    .from('leasing_conversations')
    .insert({
      owner_id: user.id,
      prospect_id: parsed.data.prospect_id ?? null,
      listing_id: parsed.data.listing_id ?? null,
      prospect_name: parsed.data.prospect_name ?? null,
      prospect_contact: parsed.data.prospect_contact ?? null,
      custom_system_prompt: parsed.data.custom_system_prompt ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to create conversation: ${error?.message ?? 'unknown error'}`,
    }
  }

  // Seed the inbound message if provided
  if (parsed.data.initial_message) {
    const content = parsed.data.initial_message
    const flags = inboundFlagsFor(content)
    await supabase.from('leasing_messages').insert({
      conversation_id: created.id,
      direction: 'inbound',
      author: 'prospect',
      content,
      guardrail_flags: flags,
    })
    await touchConversation(supabase, created.id)
  }

  revalidatePath('/dashboard/leasing-assistant')
  revalidatePath('/dashboard')
  redirect(`/dashboard/leasing-assistant/${created.id}`)
}

// ------------------------------------------------------------
// Add inbound message (paste a prospect reply)
// ------------------------------------------------------------

export async function addInboundMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InboundMessageCreateSchema.safeParse({
    conversation_id: formData.get('conversation_id'),
    content: formData.get('content'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  if (!(await verifyOwnsConversation(supabase, parsed.data.conversation_id, user.id))) {
    return { success: false, message: 'Conversation not found.' }
  }

  const flags = inboundFlagsFor(parsed.data.content)
  const { error } = await supabase.from('leasing_messages').insert({
    conversation_id: parsed.data.conversation_id,
    direction: 'inbound',
    author: 'prospect',
    content: parsed.data.content,
    guardrail_flags: flags,
  })
  if (error) {
    return {
      success: false,
      message: `Failed to add message: ${error.message}`,
    }
  }

  await touchConversation(supabase, parsed.data.conversation_id)

  revalidatePath(
    `/dashboard/leasing-assistant/${parsed.data.conversation_id}`,
  )
  return { success: true }
}

// ------------------------------------------------------------
// Generate AI draft for a conversation
// ------------------------------------------------------------

export async function generateDraftForConversation(
  conversationId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  if (!(await verifyOwnsConversation(supabase, conversationId, user.id))) {
    return { success: false, message: 'Conversation not found.' }
  }

  // Load conversation + messages + listing context
  const { data: conv, error: cErr } = await supabase
    .from('leasing_conversations')
    .select(
      `*, listing:listings (
        headline_rent,
        unit:units ( unit_number, bedrooms, bathrooms, property:properties ( name ) )
      )`,
    )
    .eq('id', conversationId)
    .maybeSingle()
  if (cErr || !conv) {
    return { success: false, message: 'Failed to load conversation.' }
  }
  const { data: msgRows, error: mErr } = await supabase
    .from('leasing_messages')
    .select('author, direction, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (mErr) {
    return { success: false, message: `Failed to load messages: ${mErr.message}` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convAny = conv as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyRows = (msgRows ?? []) as any[]

  const result = await generateDraftReply({
    conversationHistory: historyRows.map((m) => ({
      author: m.author,
      direction: m.direction,
      content: m.content,
    })),
    prospectName: convAny.prospect_name ?? null,
    listingContext: convAny.listing
      ? {
          propertyName: convAny.listing.unit?.property?.name ?? null,
          unitLabel: convAny.listing.unit?.unit_number ?? null,
          monthlyRent: convAny.listing.headline_rent ?? null,
          bedrooms: convAny.listing.unit?.bedrooms ?? null,
          bathrooms: convAny.listing.unit?.bathrooms ?? null,
        }
      : null,
    customSystemPrompt: convAny.custom_system_prompt ?? null,
  })

  const { error: insErr } = await supabase.from('leasing_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound_draft',
    author: 'ai',
    content: result.content,
    guardrail_flags: result.guardrailFlags,
  })
  if (insErr) {
    return {
      success: false,
      message: `Failed to save draft: ${insErr.message}`,
    }
  }

  await touchConversation(supabase, conversationId)
  revalidatePath(`/dashboard/leasing-assistant/${conversationId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Send (approve) an outbound message
// ------------------------------------------------------------
//
// If `draft_id` is provided, we're approving an existing draft.
// If not, it's a fresh landlord-authored message.
// If `content` differs from the draft's content, we mark edited.

export async function sendOutboundMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = OutboundMessageSendSchema.safeParse({
    conversation_id: formData.get('conversation_id'),
    content: formData.get('content'),
    draft_id: formData.get('draft_id'),
    confirm_guardrail_override: formData.get('confirm_guardrail_override'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  if (!(await verifyOwnsConversation(supabase, parsed.data.conversation_id, user.id))) {
    return { success: false, message: 'Conversation not found.' }
  }

  // Re-scan the final content. If guardrail flags are present and
  // the user didn't explicitly confirm the override, block the send.
  const flags = outboundFlagsFor(parsed.data.content)
  const hasFlags = (flags.output_flags?.length ?? 0) > 0
  if (hasFlags && !parsed.data.confirm_guardrail_override) {
    return {
      success: false,
      message:
        'This message raised fair-housing flags. Review the warnings and confirm the override to send anyway — or edit the message to remove the flagged phrasing.',
    }
  }

  const nowIso = new Date().toISOString()

  if (parsed.data.draft_id) {
    // Approving an existing draft — update in place
    const { data: draftRow, error: dErr } = await supabase
      .from('leasing_messages')
      .select('content')
      .eq('id', parsed.data.draft_id)
      .eq('conversation_id', parsed.data.conversation_id)
      .eq('direction', 'outbound_draft')
      .maybeSingle()
    if (dErr || !draftRow) {
      return { success: false, message: 'Draft not found.' }
    }
    const edited =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (draftRow as any).content.trim() !== parsed.data.content.trim()
    const { error } = await supabase
      .from('leasing_messages')
      .update({
        direction: 'outbound_sent',
        author: 'landlord',
        content: parsed.data.content,
        guardrail_flags: {
          ...flags,
          reviewed_at: nowIso,
        },
        approved_by_landlord_at: nowIso,
        edited_by_landlord: edited,
      })
      .eq('id', parsed.data.draft_id)
    if (error) {
      return {
        success: false,
        message: `Failed to send: ${error.message}`,
      }
    }
  } else {
    // Fresh landlord-authored message
    const { error } = await supabase.from('leasing_messages').insert({
      conversation_id: parsed.data.conversation_id,
      direction: 'outbound_sent',
      author: 'landlord',
      content: parsed.data.content,
      guardrail_flags: {
        ...flags,
        reviewed_at: nowIso,
      },
      approved_by_landlord_at: nowIso,
    })
    if (error) {
      return {
        success: false,
        message: `Failed to send: ${error.message}`,
      }
    }
  }

  await touchConversation(supabase, parsed.data.conversation_id)
  revalidatePath(
    `/dashboard/leasing-assistant/${parsed.data.conversation_id}`,
  )
  return { success: true }
}

// ------------------------------------------------------------
// Discard a draft
// ------------------------------------------------------------

export async function discardDraft(
  conversationId: string,
  draftId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  if (!(await verifyOwnsConversation(supabase, conversationId, user.id))) {
    return { success: false, message: 'Conversation not found.' }
  }

  const { error } = await supabase
    .from('leasing_messages')
    .delete()
    .eq('id', draftId)
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound_draft')
  if (error) {
    return { success: false, message: `Failed to discard: ${error.message}` }
  }

  revalidatePath(`/dashboard/leasing-assistant/${conversationId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Update conversation
// ------------------------------------------------------------

export async function updateConversation(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ConversationUpdateSchema.safeParse({
    status: formData.get('status'),
    custom_system_prompt: formData.get('custom_system_prompt'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('leasing_conversations')
    .update({
      status: parsed.data.status,
      custom_system_prompt: parsed.data.custom_system_prompt ?? null,
    })
    .eq('id', id)
    .eq('owner_id', user.id)
  if (error) {
    return {
      success: false,
      message: `Failed to update: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/leasing-assistant')
  revalidatePath(`/dashboard/leasing-assistant/${id}`)
  return { success: true }
}

// ------------------------------------------------------------
// Delete
// ------------------------------------------------------------

export async function deleteConversation(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('leasing_conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id)
  if (error) {
    return {
      success: false,
      message: `Failed to delete: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/leasing-assistant')
  redirect('/dashboard/leasing-assistant')
}
