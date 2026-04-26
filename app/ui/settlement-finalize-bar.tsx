'use client'

// ============================================================
// Finalize / unfinalize action bar
// ============================================================
//
// Shown when the settlement is in draft. Locks the itemization
// for legal record on finalize. Computes the legal deadline date
// from the lease end + state return-days.

import { useState, useTransition } from 'react'
import { finalizeSettlement } from '@/app/actions/security-deposits'

export function SettlementFinalizeBar({
  settlementId,
  hasItems,
  hasForwardingAddress,
}: {
  settlementId: string
  hasItems: boolean
  hasForwardingAddress: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Items can be empty (full refund). Forwarding address is the only
  // gate: you can't mail a letter without somewhere to mail it.
  const canFinalize = hasForwardingAddress

  function handleFinalize() {
    setError(null)
    startTransition(async () => {
      const result = await finalizeSettlement(settlementId)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Could not finalize.')
      }
    })
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-amber-900">
          <div className="font-semibold">Ready to finalize?</div>
          <p className="mt-1">
            Finalizing locks the itemized amounts and computes the legal
            deadline. You can still unfinalize later if you spot a mistake
            (until you mark it mailed).
          </p>
          {!canFinalize && (
            <p className="mt-2 text-xs text-amber-800">
              You need a forwarding address (street, city, and state) before
              finalizing.
            </p>
          )}
          {!hasItems && canFinalize && (
            <p className="mt-2 text-xs text-amber-800">
              No deductions added &mdash; the full deposit will be refunded.
              That&rsquo;s fine if it&rsquo;s correct.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleFinalize}
          disabled={isPending || !canFinalize}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Finalizing…' : 'Finalize letter'}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}
