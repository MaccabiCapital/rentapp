'use client'

import { useState, useTransition } from 'react'
import { regenerateCriteriaPdf } from '@/app/actions/compliance'

export function CriteriaRegenerateButton({
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
          setError(null)
          startTransition(async () => {
            const result = await regenerateCriteriaPdf(criteriaId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Regeneration failed.')
            }
          })
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        {isPending ? 'Regenerating…' : 'Regenerate PDF'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
