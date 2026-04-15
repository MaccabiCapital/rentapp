'use client'

import { useState, useTransition } from 'react'
import { deleteProspect } from '@/app/actions/prospects'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteProspectButton({
  prospectId,
  prospectName,
}: {
  prospectId: string
  prospectName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteProspect(prospectId)
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
            {isPending ? 'Deleting…' : 'Delete prospect'}
          </button>
        }
        title={`Delete ${prospectName}?`}
        description="This action can be undone by contacting support within 30 days. For fair-housing audit trail, prefer setting stage to Declined or Withdrew instead of deleting."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
