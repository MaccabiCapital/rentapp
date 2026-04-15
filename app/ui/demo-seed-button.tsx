'use client'

// ============================================================
// DemoSeedButton — one-click populate/clear demo data
// ============================================================
//
// Shows "Populate demo data" when the user has no demo rows yet,
// "Reset demo data" when they do. Calls the seed/unseed server
// actions and surfaces errors inline. Both actions redirect on
// success so we mainly care about the error path here.

import { useState, useTransition } from 'react'
import { seedDemoData, unseedDemoData } from '@/app/actions/demo-seed'

export function DemoSeedButton({
  hasDemoData,
}: {
  hasDemoData: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSeed() {
    setError(null)
    startTransition(async () => {
      const result = await seedDemoData()
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  function handleUnseed() {
    setError(null)
    startTransition(async () => {
      const result = await unseedDemoData()
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {hasDemoData ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Demo data loaded
          </span>
          <button
            type="button"
            onClick={handleUnseed}
            disabled={isPending}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Removing…' : 'Remove demo data'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSeed}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Populating…' : 'Populate demo data'}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
