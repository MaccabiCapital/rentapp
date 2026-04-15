'use client'

import { useState, useTransition } from 'react'
import { deleteMaintenanceRequest } from '@/app/actions/maintenance'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteMaintenanceButton({
  requestId,
  title,
}: {
  requestId: string
  title: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteMaintenanceRequest(requestId)
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
            {isPending ? 'Deleting…' : 'Delete request'}
          </button>
        }
        title={`Delete "${title}"?`}
        description="This permanently removes the maintenance request. Consider closing instead — closed requests stay in the audit trail with cost history."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
