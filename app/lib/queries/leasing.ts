// ============================================================
// Leasing conversation queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type {
  LeasingConversation,
  LeasingMessage,
} from '@/app/lib/schemas/leasing'

export type ConversationWithContext = LeasingConversation & {
  prospect: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    source: string | null
    stage: string
  } | null
  listing: {
    id: string
    unit: {
      unit_number: string | null
      property: {
        id: string
        name: string
      } | null
    } | null
    headline_rent: number | null
  } | null
  message_count: number
  pending_draft_count: number
}

const PROSPECT_SELECT = `
  id, first_name, last_name, email, phone, source, stage
`

const LISTING_SELECT = `
  id,
  headline_rent,
  unit:units (
    unit_number,
    property:properties ( id, name )
  )
`

async function hydrateMessageCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversationIds: string[],
): Promise<Map<string, { total: number; pendingDraft: number }>> {
  const map = new Map<string, { total: number; pendingDraft: number }>()
  if (conversationIds.length === 0) return map

  const { data, error } = await supabase
    .from('leasing_messages')
    .select('conversation_id, direction')
    .in('conversation_id', conversationIds)
  if (error) throw error

  for (const row of (data ?? []) as Array<{
    conversation_id: string
    direction: string
  }>) {
    const existing = map.get(row.conversation_id) ?? {
      total: 0,
      pendingDraft: 0,
    }
    existing.total += 1
    if (row.direction === 'outbound_draft') existing.pendingDraft += 1
    map.set(row.conversation_id, existing)
  }
  return map
}

export async function getConversations(): Promise<ConversationWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leasing_conversations')
    .select(
      `*,
      prospect:prospects ( ${PROSPECT_SELECT} ),
      listing:listings ( ${LISTING_SELECT} )`,
    )
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  const counts = await hydrateMessageCounts(
    supabase,
    rows.map((r) => r.id),
  )
  return rows.map((r) => {
    const c = counts.get(r.id) ?? { total: 0, pendingDraft: 0 }
    return { ...r, message_count: c.total, pending_draft_count: c.pendingDraft }
  })
}

export async function getConversation(id: string): Promise<{
  conversation: ConversationWithContext
  messages: LeasingMessage[]
} | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leasing_conversations')
    .select(
      `*,
      prospect:prospects ( ${PROSPECT_SELECT} ),
      listing:listings ( ${LISTING_SELECT} )`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { data: msgRows, error: mErr } = await supabase
    .from('leasing_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
  if (mErr) throw mErr

  const messages = (msgRows ?? []) as LeasingMessage[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const header = data as any

  return {
    conversation: {
      ...header,
      message_count: messages.length,
      pending_draft_count: messages.filter(
        (m) => m.direction === 'outbound_draft',
      ).length,
    },
    messages,
  }
}

// Picker list for the new-conversation form
export type ProspectPickerRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  stage: string
}

export async function getProspectsForPicker(): Promise<ProspectPickerRow[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('prospects')
    .select('id, first_name, last_name, email, phone, stage')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProspectPickerRow[]
}

// Dashboard summary
export async function getLeasingSummary(): Promise<{
  active: number
  pendingDrafts: number
  total: number
}> {
  const supabase = await createServerClient()
  const { data: convs, error: cErr } = await supabase
    .from('leasing_conversations')
    .select('id, status')
    .is('deleted_at', null)
  if (cErr) throw cErr

  const activeIds = new Set<string>()
  let total = 0
  let active = 0
  for (const row of (convs ?? []) as Array<{ id: string; status: string }>) {
    total += 1
    if (row.status === 'active') {
      active += 1
      activeIds.add(row.id)
    }
  }

  let pendingDrafts = 0
  if (activeIds.size > 0) {
    const { count } = await supabase
      .from('leasing_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound_draft')
      .in('conversation_id', Array.from(activeIds))
    pendingDrafts = count ?? 0
  }

  return { active, pendingDrafts, total }
}
