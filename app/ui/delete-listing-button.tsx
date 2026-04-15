'use client'

import { useState, useTransition } from 'react'
import { deleteListing } from '@/app/actions/listings'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteListingButton({
  listingId,
  title,
}: {
  listingId: string
  title: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteListing(listingId)
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
            {isPending ? 'Deleting…' : 'Delete listing'}
          </button>
        }
        title={`Delete "${title}"?`}
        description="This will hide the listing from the public URL. Inquiries that already came through the form will stay in your prospects pipeline."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
