'use client'

import { useState, useTransition } from 'react'
import { publishCriteria } from '@/app/actions/compliance'

export function CriteriaPublishButton({
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
              'Publish? This locks the current version and renders the PDF. You can edit and re-publish (a new version) later.',
            )
          )
            return
          setError(null)
          startTransition(async () => {
            const result = await publishCriteria(criteriaId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Publish failed.')
            }
          })
        }}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? 'Publishing…' : 'Publish + render PDF'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
