'use client'

// ============================================================
// ConvertProspectButton — creates tenant + redirects to lease
// ============================================================

import { useState, useTransition } from 'react'
import { convertProspectToTenant } from '@/app/actions/prospects'

export function ConvertProspectButton({
  prospectId,
  alreadyConverted,
}: {
  prospectId: string
  alreadyConverted: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await convertProspectToTenant(prospectId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? 'Converting…'
          : alreadyConverted
            ? 'Go to lease flow'
            : 'Convert to tenant + start lease'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
