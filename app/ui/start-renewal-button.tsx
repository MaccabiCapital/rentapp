'use client'

import { useState, useTransition } from 'react'
import { startRenewal } from '@/app/actions/leases'

export function StartRenewalButton({ leaseId }: { leaseId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await startRenewal(leaseId)
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
        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Starting…' : 'Start renewal'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
