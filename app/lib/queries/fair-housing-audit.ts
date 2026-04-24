// ============================================================
// Fair-housing audit log — aggregate every guardrail event
// ============================================================
//
// Expands leasing_messages.guardrail_flags into a flat row-per-
// event stream for the audit viewer and CSV export. A single
// message can contribute multiple rows if it tripped multiple
// flags.
//
// Retention: CLAUDE.md requires 3+ year retention (FCRA). Our
// soft-delete pattern (deleted_at) keeps the underlying rows —
// this query can be extended to include deleted conversations
// when you need to produce a full retention report.

import { createServerClient } from '@/lib/supabase/server'
import {
  INPUT_WARNING_LABELS,
  OUTPUT_FLAG_LABELS,
  type InputWarning,
  type OutputFlag,
  type GuardrailFlags,
  type InputWarningDetail,
  type OutputFlagDetail,
} from '@/app/lib/leasing/fair-housing-guardrails'

export type AuditFlagCategory = 'input_warning' | 'output_flag'

export type AuditEvent = {
  timestamp: string
  conversation_id: string
  conversation_name: string
  prospect_contact: string | null
  message_id: string
  direction: 'inbound' | 'outbound_draft' | 'outbound_sent'
  flag_category: AuditFlagCategory
  flag_type: string
  flag_label: string
  flag_note: string
  matched_text: string
  content_excerpt: string
  override_applied: boolean
}

function excerpt(text: string, max = 140): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + '…'
}

export type AuditFilters = {
  category?: AuditFlagCategory
  overridesOnly?: boolean
  startDate?: string
  endDate?: string
  includeDeleted?: boolean
}

export async function getFairHousingAuditEvents(
  filters: AuditFilters = {},
): Promise<AuditEvent[]> {
  const supabase = await createServerClient()

  // Pull all conversations this user owns — include soft-deleted
  // ones if the caller asked (for retention compliance reports).
  let convQuery = supabase
    .from('leasing_conversations')
    .select('id, prospect_id, prospect_name, prospect_contact, deleted_at')
  if (!filters.includeDeleted) {
    convQuery = convQuery.is('deleted_at', null)
  }
  const { data: convs, error: cErr } = await convQuery
  if (cErr) throw cErr

  const convById = new Map<
    string,
    {
      id: string
      name: string
      contact: string | null
    }
  >()
  for (const rawRow of convs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = rawRow as any
    convById.set(row.id, {
      id: row.id,
      name: row.prospect_name ?? 'Unnamed prospect',
      contact: row.prospect_contact ?? null,
    })
  }

  if (convById.size === 0) return []

  // Pull all messages for those conversations, applying date
  // filters at the query level so we don't scan the whole table.
  let msgQuery = supabase
    .from('leasing_messages')
    .select(
      'id, conversation_id, direction, content, guardrail_flags, created_at',
    )
    .in('conversation_id', Array.from(convById.keys()))
    .order('created_at', { ascending: false })

  if (filters.startDate) {
    msgQuery = msgQuery.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    // Inclusive end-of-day semantics
    msgQuery = msgQuery.lte('created_at', `${filters.endDate}T23:59:59.999Z`)
  }

  const { data: msgRows, error: mErr } = await msgQuery
  if (mErr) throw mErr

  const events: AuditEvent[] = []

  for (const rawRow of msgRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = rawRow as any
    const conv = convById.get(msg.conversation_id)
    if (!conv) continue

    const flags = (msg.guardrail_flags ?? {}) as GuardrailFlags
    const directionStr = msg.direction as AuditEvent['direction']
    const overrideApplied =
      directionStr === 'outbound_sent' && (flags.output_flags?.length ?? 0) > 0

    // Expand input warnings
    if (flags.input_warnings?.length && filters.category !== 'output_flag') {
      for (const warning of flags.input_warnings as InputWarningDetail[]) {
        if (filters.overridesOnly) continue
        events.push({
          timestamp: msg.created_at,
          conversation_id: conv.id,
          conversation_name: conv.name,
          prospect_contact: conv.contact,
          message_id: msg.id,
          direction: directionStr,
          flag_category: 'input_warning',
          flag_type: warning.type,
          flag_label: INPUT_WARNING_LABELS[warning.type as InputWarning],
          flag_note: warning.note,
          matched_text: warning.match,
          content_excerpt: excerpt(msg.content ?? ''),
          override_applied: false,
        })
      }
    }

    // Expand output flags
    if (flags.output_flags?.length && filters.category !== 'input_warning') {
      for (const flag of flags.output_flags as OutputFlagDetail[]) {
        if (filters.overridesOnly && !overrideApplied) continue
        events.push({
          timestamp: msg.created_at,
          conversation_id: conv.id,
          conversation_name: conv.name,
          prospect_contact: conv.contact,
          message_id: msg.id,
          direction: directionStr,
          flag_category: 'output_flag',
          flag_type: flag.type,
          flag_label: OUTPUT_FLAG_LABELS[flag.type as OutputFlag],
          flag_note: flag.note,
          matched_text: flag.match,
          content_excerpt: excerpt(msg.content ?? ''),
          override_applied: overrideApplied,
        })
      }
    }
  }

  return events
}

// Aggregate summary for the header cards
export type AuditSummary = {
  total: number
  inputWarnings: number
  outputFlags: number
  overrides: number
  conversationsAffected: number
  byFlagType: Array<{ type: string; label: string; count: number }>
}

export async function getAuditSummary(
  filters: AuditFilters = {},
): Promise<AuditSummary> {
  const events = await getFairHousingAuditEvents({
    ...filters,
    overridesOnly: false,
    category: undefined,
  })

  const convIds = new Set<string>()
  const byFlag = new Map<string, { label: string; count: number }>()
  let inputWarnings = 0
  let outputFlags = 0
  let overrides = 0
  for (const e of events) {
    convIds.add(e.conversation_id)
    if (e.flag_category === 'input_warning') inputWarnings += 1
    else outputFlags += 1
    if (e.override_applied) overrides += 1
    const prev = byFlag.get(e.flag_type) ?? { label: e.flag_label, count: 0 }
    prev.count += 1
    prev.label = e.flag_label
    byFlag.set(e.flag_type, prev)
  }

  return {
    total: events.length,
    inputWarnings,
    outputFlags,
    overrides,
    conversationsAffected: convIds.size,
    byFlagType: Array.from(byFlag.entries())
      .map(([type, v]) => ({ type, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count),
  }
}
