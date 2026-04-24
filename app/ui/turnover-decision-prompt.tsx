'use client'

// ============================================================
// Turnover decision prompt — surfaces when notice is given but
// the landlord hasn't picked a turnover strategy yet
// ============================================================
//
// Two options:
//   1. List during notice — minimize vacant days
//   2. Wait until move-out — defer for a full refresh
//
// Saves to leases.turnover_strategy. "Change decision" lets the
// landlord flip their choice later.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTurnoverStrategy } from '@/app/actions/turnover-strategy'
import type { TurnoverStrategy } from '@/app/actions/turnover-strategy'

export function TurnoverDecisionPrompt({
  leaseId,
  currentStrategy,
}: {
  leaseId: string
  currentStrategy: TurnoverStrategy | null
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function choose(strategy: TurnoverStrategy | null) {
    startTransition(async () => {
      await setTurnoverStrategy(leaseId, strategy)
      router.refresh()
    })
  }

  if (currentStrategy === null) {
    return (
      <div className="mb-4 rounded-lg border-2 border-indigo-300 bg-indigo-50/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤔</span>
          <h3 className="text-sm font-semibold text-indigo-900">
            Decide your turnover approach
          </h3>
        </div>
        <p className="mt-1 text-sm text-indigo-900">
          Notice has been given. Are you starting the turnover phase now (list
          the unit during the notice period to minimize vacant days), or
          waiting until after move-out (for a full refresh before showings)?
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => choose('list_during_notice')}
            disabled={isPending}
            className="rounded-md border border-indigo-300 bg-white p-3 text-left text-sm transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60"
          >
            <div className="font-semibold text-indigo-900">
              List during notice
            </div>
            <div className="mt-1 text-xs text-indigo-700">
              Standard path. Start showings now with entry notices to the
              outgoing tenant. Aim for a zero-day vacancy.
            </div>
          </button>
          <button
            type="button"
            onClick={() => choose('wait_until_vacant')}
            disabled={isPending}
            className="rounded-md border border-indigo-300 bg-white p-3 text-left text-sm transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60"
          >
            <div className="font-semibold text-indigo-900">
              Wait until move-out
            </div>
            <div className="mt-1 text-xs text-indigo-700">
              Unit needs paint, carpet, or major work first. Listing will be
              blocked until the unit is vacant and refreshed.
            </div>
          </button>
        </div>
      </div>
    )
  }

  const isListingNow = currentStrategy === 'list_during_notice'
  const otherStrategy: TurnoverStrategy = isListingNow
    ? 'wait_until_vacant'
    : 'list_during_notice'
  const otherLabel = isListingNow
    ? 'wait until move-out'
    : 'list during notice'

  return (
    <div
      className={`mb-4 rounded-lg border p-3 text-sm ${
        isListingNow
          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
          : 'border-amber-200 bg-amber-50/60 text-amber-900'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">
            {isListingNow
              ? '✓ Turnover strategy: list during notice'
              : '⏸ Turnover strategy: wait until move-out'}
          </span>
          <p className="mt-0.5 text-xs">
            {isListingNow
              ? 'Step 6 is unlocked — list the unit, schedule showings with entry notices.'
              : 'Step 6 is deferred — will unlock when the unit is marked vacant.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => choose(otherStrategy)}
            disabled={isPending}
            className="text-xs underline hover:no-underline"
          >
            Switch to &ldquo;{otherLabel}&rdquo;
          </button>
          <button
            type="button"
            onClick={() => choose(null)}
            disabled={isPending}
            className="text-xs text-zinc-600 hover:text-zinc-900"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
