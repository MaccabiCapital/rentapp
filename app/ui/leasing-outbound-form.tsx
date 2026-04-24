'use client'

// ============================================================
// Landlord-authored outbound message (no AI draft)
// ============================================================

import { useActionState, useRef, useEffect } from 'react'
import { sendOutboundMessage } from '@/app/actions/leasing'
import { emptyActionState } from '@/app/lib/types'

export function LeasingOutboundForm({
  conversationId,
}: {
  conversationId: string
}) {
  const [state, formAction, isPending] = useActionState(
    sendOutboundMessage,
    emptyActionState,
  )
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.success === true && ref.current) {
      ref.current.reset()
    }
  }, [state])

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form
      ref={ref}
      action={formAction}
      className="space-y-2 rounded-md border border-zinc-200 bg-white p-3"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className="text-sm font-semibold text-zinc-900">
        Write a reply (no AI)
      </div>
      <textarea
        name="content"
        rows={4}
        required
        placeholder="Write your reply to the prospect. The outbound scanner will flag any fair-housing issues before sending."
        className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {errors.content && (
        <p className="text-xs text-red-600">{errors.content[0]}</p>
      )}
      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          {message}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            name="confirm_guardrail_override"
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
          />
          Override any fair-housing flags
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isPending ? 'Recording…' : 'Record as sent'}
        </button>
      </div>
    </form>
  )
}
