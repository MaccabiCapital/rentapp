'use client'

import { useState, useTransition } from 'react'
import { deleteRentersInsurancePolicy } from '@/app/actions/renters-insurance'

export function RentersInsuranceDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-sm text-zinc-500 hover:text-red-600"
      >
        Delete policy
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-zinc-700">Delete this policy?</span>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await deleteRentersInsurancePolicy(id)
          })
        }
        disabled={isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
      >
        {isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        Cancel
      </button>
    </span>
  )
}
