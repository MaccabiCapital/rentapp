'use client'

import { useActionState, useState } from 'react'
import { markLateFeePaid } from '@/app/actions/late-fees'
import { emptyActionState } from '@/app/lib/types'

export function LateFeeMarkPaidButton({ chargeId }: { chargeId: string }) {
  const [open, setOpen] = useState(false)
  const action = markLateFeePaid.bind(null, chargeId)
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
        className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        Mark paid
      </button>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        type="date"
        name="paid_on"
        defaultValue={today}
        required
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-600 hover:text-zinc-900"
      >
        Cancel
      </button>
      {(errors.paid_on || message) && (
        <span className="text-xs text-red-600">
          {errors.paid_on?.[0] ?? message}
        </span>
      )}
    </form>
  )
}
