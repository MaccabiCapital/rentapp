'use client'

import { useState, useTransition } from 'react'
import { runLateFeeScanNow } from '@/app/actions/late-fees'

export function LateFeeRunScanButton() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await runLateFeeScanNow()
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Scan failed.')
            }
          })
        }}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {isPending ? 'Scanning…' : 'Run scan now'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
