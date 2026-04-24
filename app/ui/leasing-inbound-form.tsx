'use client'

// ============================================================
// Paste-new-inbound-message form
// ============================================================

import { useActionState, useRef, useEffect } from 'react'
import { addInboundMessage } from '@/app/actions/leasing'
import { emptyActionState } from '@/app/lib/types'

export function LeasingInboundForm({
  conversationId,
}: {
  conversationId: string
}) {
  const [state, formAction, isPending] = useActionState(
    addInboundMessage,
    emptyActionState,
  )
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.success === true && ref.current) ref.current.reset()
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
        Paste a new inbound message
      </div>
      <textarea
        name="content"
        rows={3}
        required
        placeholder="Paste what the prospect just said (email, SMS, voicemail transcript)…"
        className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {errors.content && (
        <p className="text-xs text-red-600">{errors.content[0]}</p>
      )}
      {message && <p className="text-xs text-red-600">{message}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-900 disabled:bg-zinc-400"
        >
          {isPending ? 'Adding…' : 'Log inbound message'}
        </button>
      </div>
    </form>
  )
}
