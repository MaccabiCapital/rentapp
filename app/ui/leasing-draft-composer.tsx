'use client'

// ============================================================
// Draft composer — review, edit, approve & send an AI draft
// ============================================================
//
// A single draft row is rendered by this component. Landlord
// can edit the content inline, optionally override guardrail
// flags, then either send or discard. Sending flips the
// message to outbound_sent; discarding deletes the row.
//
// The outbound guardrail scan re-runs server-side when the
// landlord hits Send, so local edits re-trigger validation.

import { useActionState, useState, useTransition } from 'react'
import { sendOutboundMessage, discardDraft } from '@/app/actions/leasing'
import { emptyActionState } from '@/app/lib/types'
import type {
  LeasingMessage,
} from '@/app/lib/schemas/leasing'
import {
  OUTPUT_FLAG_LABELS,
} from '@/app/lib/leasing/fair-housing-guardrails'

export function LeasingDraftComposer({
  conversationId,
  draft,
}: {
  conversationId: string
  draft: LeasingMessage
}) {
  const [state, formAction, isPending] = useActionState(
    sendOutboundMessage,
    emptyActionState,
  )
  const [content, setContent] = useState(draft.content)
  const [override, setOverride] = useState(false)
  const [isDiscarding, startDiscard] = useTransition()

  const initialOutputFlags = draft.guardrail_flags.output_flags ?? []

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form
      action={formAction}
      className="rounded-md border-2 border-purple-200 bg-purple-50/40 p-4"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input type="hidden" name="draft_id" value={draft.id} />

      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
          AI draft — awaiting your approval
        </span>
        <span className="text-xs text-zinc-500">
          Drafted {new Date(draft.created_at).toLocaleString('en-US')}
        </span>
      </div>

      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        required
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {/* Guardrail output flags from the initial scan */}
      {initialOutputFlags.length > 0 && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <div className="font-semibold">
            This draft tripped {initialOutputFlags.length} fair-housing
            flag{initialOutputFlags.length === 1 ? '' : 's'}:
          </div>
          <ul className="mt-1 space-y-1">
            {initialOutputFlags.map((f, i) => (
              <li key={i}>
                • {OUTPUT_FLAG_LABELS[f.type]}: {f.note}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Edit the message above until the flag is gone, or tick the
            override box and send with the flag on record.
          </p>
        </div>
      )}

      {/* Server-side error / guardrail block */}
      {message && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          {message}
        </div>
      )}
      {errors.content && (
        <p className="mt-1 text-xs text-red-600">{errors.content[0]}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            name="confirm_guardrail_override"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
          />
          I&rsquo;ve reviewed the guardrail warnings and want to send as-is
          (logged for audit)
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              startDiscard(async () => {
                await discardDraft(conversationId, draft.id)
              })
            }}
            disabled={isDiscarding || isPending}
            className="text-xs text-zinc-500 hover:text-red-600"
          >
            {isDiscarding ? 'Discarding…' : 'Discard draft'}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isPending ? 'Sending…' : 'Approve & record as sent'}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        &ldquo;Record as sent&rdquo; marks the message approved. Actual
        delivery (email / SMS) is not wired up yet — copy the approved text
        to whatever channel the prospect used (Zillow inbox, email reply,
        etc.).
      </p>
    </form>
  )
}
