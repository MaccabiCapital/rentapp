'use client'

import { useState, useTransition } from 'react'
import { markRentScheduleCollected } from '@/app/actions/rent'

export function MarkRentPaidButton({
  scheduleId,
  disabled,
}: {
  scheduleId: string
  disabled?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await markRentScheduleCollected(scheduleId, 'cash')
      if (result && !result.success && 'message' in result) {
        setError(result.message ?? 'Something went wrong.')
      }
    })
  }

  if (disabled) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Marking…' : 'Mark paid'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
