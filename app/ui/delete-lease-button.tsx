'use client'

import { useState, useTransition } from 'react'
import { deleteLease } from '@/app/actions/leases'
import { ConfirmDialog } from './confirm-dialog'

// Soft-delete wrapper. The server action only allows deleting
// draft leases; we surface the blocked message inline.
export function DeleteLeaseButton({ leaseId }: { leaseId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteLease(leaseId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={isPending}
            className="text-sm text-zinc-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete draft'}
          </button>
        }
        title="Delete this draft lease?"
        description="The draft will be removed. Only draft leases can be deleted — active and terminated leases stay in the audit trail."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
