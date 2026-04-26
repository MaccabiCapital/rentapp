'use client'

import { useState, useTransition } from 'react'
import { deleteCriteria } from '@/app/actions/compliance'

export function CriteriaDeleteButton({
  criteriaId,
}: {
  criteriaId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              'Delete this criteria? Past version snapshots are kept for audit but the criteria will no longer appear in the library.',
            )
          )
            return
          setError(null)
          startTransition(async () => {
            const result = await deleteCriteria(criteriaId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Delete failed.')
            }
          })
        }}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
