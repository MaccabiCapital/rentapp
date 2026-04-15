'use client'

// ============================================================
// DeletePropertyButton — confirm-dialog-wrapped delete trigger
// ============================================================
//
// The actual soft-delete is a server action; this client
// component just handles the confirmation UX. Error returned
// from the action (e.g. "Remove all units before deleting")
// is surfaced inline. On success the action redirects away,
// so the error state is only visible when blocked.

import { useState, useTransition } from 'react'
import { deleteProperty } from '@/app/actions/properties'
import { ConfirmDialog } from './confirm-dialog'

export function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string
  propertyName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteProperty(propertyId)
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
            {isPending ? 'Deleting…' : 'Delete property'}
          </button>
        }
        title={`Delete ${propertyName}?`}
        description="This action can be undone by contacting support within 30 days. The property will be hidden from all views immediately."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
