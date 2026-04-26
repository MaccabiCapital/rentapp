'use client'

import { useState, useTransition } from 'react'
import {
  createScreeningReport,
  rerunScreeningReport,
} from '@/app/actions/screening'

export function ProspectScreeningRunButton({
  prospectId,
  existingReportId,
  isRunning,
  documentsCount,
}: {
  prospectId: string
  existingReportId: string | null
  isRunning: boolean
  documentsCount: number
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const disabled = isPending || isRunning || documentsCount === 0
  const label = existingReportId
    ? isPending
      ? 'Re-running…'
      : 'Re-run Proof Check'
    : isPending
      ? 'Running…'
      : 'Run Proof Check'

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = existingReportId
        ? await rerunScreeningReport(existingReportId)
        : await createScreeningReport(prospectId)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Run failed.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {label}
      </button>
      {documentsCount === 0 && !isPending && (
        <span className="text-xs text-zinc-500">
          Upload at least one document first.
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
