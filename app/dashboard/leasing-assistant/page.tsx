// ============================================================
// Dashboard → AI Leasing assistant → list page
// ============================================================
//
// Conversations with prospects, newest activity first. Pending
// AI drafts (awaiting landlord approval) show a purple badge
// as the call-to-action.

import Link from 'next/link'
import { getConversations } from '@/app/lib/queries/leasing'
import {
  CONVERSATION_STATUS_LABELS,
  type ConversationStatus,
} from '@/app/lib/schemas/leasing'
import { getAssistantMode } from '@/app/lib/leasing/assistant-service'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_BADGE: Record<ConversationStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-zinc-100 text-zinc-700',
  closed_won: 'bg-indigo-100 text-indigo-800',
  closed_lost: 'bg-zinc-100 text-zinc-500',
}

export default async function LeasingAssistantPage() {
  const conversations = await getConversations()
  const mode = getAssistantMode()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            AI Leasing assistant
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Draft replies to prospect inquiries with fair-housing-aware
            guardrails. You approve every message before it&rsquo;s sent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/leasing-assistant/audit"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Audit log
          </Link>
          <Link
            href="/dashboard/leasing-assistant/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            New conversation
          </Link>
        </div>
      </div>

      {/* Fair-housing disclosure banner */}
      <div className="mb-4 rounded-md border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <div className="font-semibold">Fair-housing safe harbor</div>
        <p className="mt-1 text-indigo-800">
          The assistant drafts replies for you to review. It never approves,
          denies, or makes any housing decision. It is instructed to ignore
          any protected-class information a prospect discloses (race,
          religion, familial status, disability, source of income, etc.).
          Inbound messages get an amber warning banner when a protected-class
          disclosure is detected so you can consciously disregard it in your
          decision. Every outbound message is scanned for decision language
          before you can send.
        </p>
      </div>

      {/* Assistant mode banner */}
      {mode === 'stub' && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold">
            Assistant is in stub mode (no LLM connected)
          </div>
          <p className="mt-1 text-amber-800">
            Drafts right now are canned placeholder text. When you pick an
            LLM provider (Anthropic / OpenAI / etc.), set{' '}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">
              LEASING_ASSISTANT_ENABLED=true
            </code>{' '}
            and an API key in <code className="font-mono text-xs">.env.local</code>,
            and everything else works as-is.
          </p>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No conversations yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Start a conversation by picking a prospect who&rsquo;s inquired,
            or paste a message from a new lead you want to reply to.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/leasing-assistant/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Start a conversation
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Prospect</Th>
                <Th>Listing</Th>
                <Th>Last activity</Th>
                <Th>Messages</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {conversations.map((c) => {
                const name =
                  c.prospect_name ??
                  (c.prospect
                    ? `${c.prospect.first_name ?? ''} ${c.prospect.last_name ?? ''}`.trim() || 'Unnamed'
                    : 'Unnamed prospect')
                const contact =
                  c.prospect_contact ??
                  c.prospect?.email ??
                  c.prospect?.phone ??
                  null
                const propertyName =
                  c.listing?.unit?.property?.name ?? null
                const unitLabel = c.listing?.unit?.unit_number ?? null
                return (
                  <tr key={c.id} className="even:bg-zinc-50/40">
                    <Td>
                      <Link
                        href={`/dashboard/leasing-assistant/${c.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {name}
                      </Link>
                      {contact && (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {contact}
                        </div>
                      )}
                    </Td>
                    <Td>
                      {propertyName ? (
                        <>
                          <div className="text-sm">{propertyName}</div>
                          {unitLabel && (
                            <div className="text-xs text-zinc-500">
                              Unit {unitLabel}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="text-sm">
                        {formatDate(c.last_message_at ?? c.created_at)}
                      </div>
                    </Td>
                    <Td>
                      <div>{c.message_count}</div>
                      {c.pending_draft_count > 0 && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          {c.pending_draft_count} draft
                          {c.pending_draft_count === 1 ? '' : 's'} to review
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                      >
                        {CONVERSATION_STATUS_LABELS[c.status]}
                      </span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}
