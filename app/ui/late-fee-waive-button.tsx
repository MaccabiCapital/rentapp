'use client'

import { useActionState, useState } from 'react'
import { waiveLateFee } from '@/app/actions/late-fees'
import { emptyActionState } from '@/app/lib/types'

export function LateFeeWaiveButton({ chargeId }: { chargeId: string }) {
  const [open, setOpen] = useState(false)
  const action = waiveLateFee.bind(null, chargeId)
  const [state, formAction, isPending] = useActionState(action, emptyActionState)
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Waive
      </button>
    )
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        type="text"
        name="reason"
        required
        placeholder="Reason (for audit)"
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? 'Waiving…' : 'Waive'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-600 hover:text-zinc-900"
      >
        Cancel
      </button>
      {(errors.reason || message) && (
        <span className="text-xs text-red-600">
          {errors.reason?.[0] ?? message}
        </span>
      )}
    </form>
  )
}
