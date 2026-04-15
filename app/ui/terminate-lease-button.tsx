'use client'

import { useState, useTransition } from 'react'
import { terminateLease } from '@/app/actions/leases'
import { ConfirmDialog } from './confirm-dialog'

export function TerminateLeaseButton({ leaseId }: { leaseId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await terminateLease(leaseId)
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
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Terminating…' : 'Terminate lease'}
          </button>
        }
        title="Terminate this lease?"
        description="The lease will move to Terminated and the unit will be marked Vacant. History is preserved — you can still see this lease in the tenant's record."
        confirmLabel="Terminate"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
