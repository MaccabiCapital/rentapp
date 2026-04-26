'use client'

// ============================================================
// Screening decision bar
// ============================================================
//
// CRITICAL FAIR-HOUSING RULE: All three buttons (Approve, Request
// more info, Reject) must remain enabled regardless of the report's
// risk band or signal count. The landlord makes the call. The
// system never auto-rejects, never disables Approve. This is the
// load-bearing acceptance test in §5 of PROOF-CHECK-SPEC.md.

import { useActionState } from 'react'
import { recordScreeningDecision } from '@/app/actions/screening'
import { emptyActionState } from '@/app/lib/types'

const DECISION_LABELS: Record<string, string> = {
  approved: 'Approved',
  requested_more_info: 'Requested more info',
  rejected: 'Rejected',
}

export function ScreeningDecisionBar({
  reportId,
  currentDecision,
}: {
  reportId: string
  currentDecision: string | null
}) {
  const action = recordScreeningDecision.bind(null, reportId)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  return (
    <div className="sticky bottom-4 mt-8 rounded-lg border border-zinc-300 bg-white p-4 shadow-lg">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Decision
      </div>

      {currentDecision && (
        <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">
          Current: <strong>{DECISION_LABELS[currentDecision] ?? currentDecision}</strong>{' '}
          — submit again to update.
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <textarea
          name="notes"
          rows={2}
          placeholder="Notes for the audit log (optional)"
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            name="decision"
            value="approved"
            disabled={isPending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="submit"
            name="decision"
            value="requested_more_info"
            disabled={isPending}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Request more info
          </button>
          <button
            type="submit"
            name="decision"
            value="rejected"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>

          {justSaved && (
            <span className="ml-2 text-xs text-emerald-700">Recorded.</span>
          )}
        </div>

        {(errors.decision || message) && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {errors.decision?.[0] ?? message}
          </p>
        )}
      </form>

      <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        <strong>Fair-housing notice:</strong> All decisions on this page are
        made by the landlord based on legally-allowed criteria. The system
        does not auto-decide, does not recommend, and never disables any
        decision based on screening signals. Every decision is logged for
        the FCRA-required retention period.
      </p>
    </div>
  )
}
