'use client'

import { useState, useTransition } from 'react'
import { deleteSettlement } from '@/app/actions/security-deposits'

export function SettlementDeleteButton({
  settlementId,
}: {
  settlementId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Delete this draft settlement? This cannot be undone.'))
            return
          setError(null)
          startTransition(async () => {
            const result = await deleteSettlement(settlementId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Could not delete.')
            }
          })
        }}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete draft'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
