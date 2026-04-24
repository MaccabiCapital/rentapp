'use client'

// ============================================================
// Conversation status + custom-prompt editor + delete
// ============================================================

import { useActionState, useState, useTransition } from 'react'
import {
  updateConversation,
  deleteConversation,
} from '@/app/actions/leasing'
import {
  CONVERSATION_STATUS_VALUES,
  CONVERSATION_STATUS_LABELS,
  type ConversationStatus,
} from '@/app/lib/schemas/leasing'
import { emptyActionState } from '@/app/lib/types'

export function LeasingStatusForm({
  conversationId,
  currentStatus,
  currentPrompt,
}: {
  conversationId: string
  currentStatus: ConversationStatus
  currentPrompt: string | null
}) {
  const bound = updateConversation.bind(null, conversationId)
  const [state, formAction, isPending] = useActionState(bound, emptyActionState)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const saved = state.success === true

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-3">
      <form action={formAction} className="space-y-3">
        <div className="text-sm font-semibold text-zinc-900">
          Conversation settings
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-xs font-medium text-zinc-600"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={currentStatus}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {CONVERSATION_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {CONVERSATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="custom_system_prompt"
            className="block text-xs font-medium text-zinc-600"
          >
            Custom preferences <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="custom_system_prompt"
            name="custom_system_prompt"
            rows={3}
            defaultValue={currentPrompt ?? ''}
            placeholder="e.g. 'Service animals only (no pets). Prefer 12-month leases.'"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Added after the built-in fair-housing rules — cannot override them.
          </p>
        </div>
        {errors.status && (
          <p className="text-xs text-red-600">{errors.status[0]}</p>
        )}
        {message && <p className="text-xs text-red-600">{message}</p>}
        <div className="flex items-center justify-end gap-2">
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>

      <div className="border-t border-zinc-100 pt-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-700">
              Delete this conversation?
            </span>
            <button
              type="button"
              onClick={() =>
                startDelete(async () => {
                  await deleteConversation(conversationId)
                })
              }
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:bg-red-400"
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-zinc-500 hover:text-red-600"
          >
            Delete conversation
          </button>
        )}
      </div>
    </div>
  )
}
