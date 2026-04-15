'use client'

import { useState, useTransition } from 'react'
import { toggleListingActive } from '@/app/actions/listings'

export function ListingToggleButton({
  listingId,
  isActive,
}: {
  listingId: string
  isActive: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await toggleListingActive(listingId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          isActive
            ? 'rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60'
            : 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
        }
      >
        {isPending
          ? '…'
          : isActive
            ? 'Deactivate'
            : 'Reactivate'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
