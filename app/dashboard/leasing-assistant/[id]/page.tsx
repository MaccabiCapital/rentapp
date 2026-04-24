// ============================================================
// Dashboard → AI Leasing assistant → [id] conversation detail
// ============================================================
//
// Thread view of messages with guardrail warnings, plus the
// composer for:
//   • Pasting new inbound messages
//   • Reviewing and approving AI drafts
//   • Writing landlord-authored replies directly
// and a side panel for status + custom prompt + delete.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getConversation } from '@/app/lib/queries/leasing'
import {
  CONVERSATION_STATUS_LABELS,
  type ConversationStatus,
  type LeasingMessage,
  type MessageAuthor,
} from '@/app/lib/schemas/leasing'
import { getAssistantMode } from '@/app/lib/leasing/assistant-service'
import { GuardrailWarnings } from '@/app/ui/leasing-guardrail-warnings'
import { LeasingInboundForm } from '@/app/ui/leasing-inbound-form'
import { LeasingOutboundForm } from '@/app/ui/leasing-outbound-form'
import { LeasingDraftComposer } from '@/app/ui/leasing-draft-composer'
import { LeasingGenerateButton } from '@/app/ui/leasing-generate-button'
import { LeasingStatusForm } from '@/app/ui/leasing-status-form'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US')
}

const AUTHOR_LABELS: Record<MessageAuthor, string> = {
  prospect: 'Prospect',
  landlord: 'You',
  ai: 'AI draft',
}

const STATUS_BADGE: Record<ConversationStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-zinc-100 text-zinc-700',
  closed_won: 'bg-indigo-100 text-indigo-800',
  closed_lost: 'bg-zinc-100 text-zinc-500',
}

export default async function LeasingConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getConversation(id)
  if (!result) notFound()
  const { conversation, messages } = result
  const mode = getAssistantMode()

  const prospectName =
    conversation.prospect_name ??
    (conversation.prospect
      ? `${conversation.prospect.first_name ?? ''} ${conversation.prospect.last_name ?? ''}`.trim() ||
        'Unnamed prospect'
      : 'Unnamed prospect')
  const contact =
    conversation.prospect_contact ??
    conversation.prospect?.email ??
    conversation.prospect?.phone ??
    null

  const propertyName = conversation.listing?.unit?.property?.name ?? null
  const unitLabel = conversation.listing?.unit?.unit_number ?? null

  // Latest message should drive whether the next step is "draft a reply"
  // or "log their next inbound"
  const latestMessage: LeasingMessage | null =
    messages.length > 0 ? messages[messages.length - 1] : null
  const latestIsInbound = latestMessage?.direction === 'inbound'

  // Split drafts (to review) from sent
  const drafts = messages.filter((m) => m.direction === 'outbound_draft')

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/leasing-assistant"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Leasing assistant
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[conversation.status]}`}
            >
              {CONVERSATION_STATUS_LABELS[conversation.status]}
            </span>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              {prospectName}
            </h1>
            {contact && (
              <p className="mt-1 text-sm text-zinc-600">{contact}</p>
            )}
            {propertyName && (
              <p className="mt-1 text-xs text-zinc-500">
                Inquiring about {propertyName}
                {unitLabel && <> · Unit {unitLabel}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {latestIsInbound && (
              <LeasingGenerateButton
                conversationId={conversation.id}
                mode={mode}
              />
            )}
          </div>
        </div>
      </div>

      {/* Two-column: thread on the left, settings on the right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {/* Message thread */}
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              No messages yet. Paste an inbound message below, or generate an
              AI draft opener.
            </div>
          ) : (
            messages
              .filter((m) => m.direction !== 'outbound_draft')
              .map((m) => (
                <MessageCard key={m.id} message={m} />
              ))
          )}

          {/* Drafts awaiting review */}
          {drafts.map((d) => (
            <LeasingDraftComposer
              key={d.id}
              conversationId={conversation.id}
              draft={d}
            />
          ))}

          {/* Inbound + outbound composer forms */}
          <div className="grid grid-cols-1 gap-3 pt-4">
            <LeasingInboundForm conversationId={conversation.id} />
            <LeasingOutboundForm conversationId={conversation.id} />
          </div>
        </div>

        <aside className="space-y-4">
          <LeasingStatusForm
            conversationId={conversation.id}
            currentStatus={conversation.status}
            currentPrompt={conversation.custom_system_prompt}
          />

          <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            <div className="font-semibold text-zinc-900">
              How the assistant works
            </div>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>Draft replies are AI-generated but never auto-sent.</li>
              <li>
                Inbound messages are scanned for protected-class mentions —
                amber banner alerts you.
              </li>
              <li>
                Outbound drafts are scanned for decision language or
                discriminatory phrasing — red banner blocks send.
              </li>
              <li>
                System prompt bakes in fair-housing rules that the custom
                preferences can&rsquo;t override.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function MessageCard({ message }: { message: LeasingMessage }) {
  const fromProspect = message.direction === 'inbound'
  const containerCls = fromProspect
    ? 'border-zinc-200 bg-zinc-50'
    : 'border-indigo-200 bg-indigo-50/40'
  const labelColor = fromProspect ? 'text-zinc-600' : 'text-indigo-700'

  return (
    <div className={`rounded-md border p-4 ${containerCls}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
          {AUTHOR_LABELS[message.author]}
          {message.edited_by_landlord && (
            <span className="ml-2 text-[10px] font-normal normal-case text-zinc-500">
              (edited before sending)
            </span>
          )}
        </span>
        <span className="text-xs text-zinc-500">
          {formatDateTime(message.created_at)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-zinc-900">
        {message.content}
      </p>

      <GuardrailWarnings
        flags={message.guardrail_flags}
        variant={fromProspect ? 'inbound' : 'outbound'}
      />
    </div>
  )
}
