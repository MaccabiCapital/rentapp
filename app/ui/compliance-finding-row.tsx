'use client'

// ============================================================
// Compliance finding row
// ============================================================
//
// Expandable row for the findings inbox. Severity badge + title in
// collapsed state; full detail + suggested fix + actions when open.
//
// Actions: Acknowledge / Mark fixed / Dismiss (with required reason).

import { useActionState, useState, useTransition } from 'react'
import {
  acknowledgeFinding,
  markFindingFixed,
  dismissFinding,
} from '@/app/actions/compliance'
import { emptyActionState } from '@/app/lib/types'
import {
  FH_FINDING_SEVERITY_LABELS,
  FH_FINDING_SEVERITY_BADGE,
  FH_FINDING_STATUS_LABELS,
  FH_FINDING_SOURCE_LABELS,
  FH_PROTECTED_CLASS_LABELS,
  type ComplianceFinding,
} from '@/app/lib/schemas/compliance'

export function ComplianceFindingRow({ finding }: { finding: ComplianceFinding }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showDismiss, setShowDismiss] = useState(false)

  const dismissAction = dismissFinding.bind(null, finding.id)
  const [dismissState, dismissFormAction, isDismissing] = useActionState(
    dismissAction,
    emptyActionState,
  )
  const dismissErrors =
    dismissState.success === false && 'errors' in dismissState
      ? dismissState.errors
      : {}
  const dismissMessage =
    dismissState.success === false && 'message' in dismissState
      ? dismissState.message
      : null

  function callAck() {
    setError(null)
    startTransition(async () => {
      const result = await acknowledgeFinding(finding.id)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Failed.')
      }
    })
  }

  function callFixed() {
    setError(null)
    startTransition(async () => {
      const result = await markFindingFixed(finding.id)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Failed.')
      }
    })
  }

  const isOpen = finding.status === 'open'
  const isTerminal =
    finding.status === 'fixed' ||
    finding.status === 'dismissed' ||
    finding.status === 'resolved_external'

  return (
    <details className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FH_FINDING_SEVERITY_BADGE[finding.severity]}`}
        >
          {FH_FINDING_SEVERITY_LABELS[finding.severity]}
        </span>
        <span className="text-sm font-medium text-zinc-900">
          {finding.title}
        </span>
        <span className="ml-auto text-xs text-zinc-400">
          {FH_FINDING_SOURCE_LABELS[finding.source]} · {finding.jurisdiction}
          {' · '}
          {FH_FINDING_STATUS_LABELS[finding.status]}
        </span>
      </summary>

      <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
        <p>{finding.detail}</p>

        {finding.trigger_text && (
          <div className="rounded bg-amber-50 p-2 text-xs">
            <strong>Triggered by: </strong>
            <code className="rounded bg-amber-100 px-1 py-0.5">
              {finding.trigger_text}
            </code>
          </div>
        )}

        {finding.suggested_fix && (
          <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
            <strong>Suggested rewrite: </strong>
            {finding.suggested_fix}
          </div>
        )}

        {finding.implicated_classes.length > 0 && (
          <div className="text-xs text-zinc-500">
            <strong>Protected class(es): </strong>
            {finding.implicated_classes
              .map((c) => FH_PROTECTED_CLASS_LABELS[c])
              .join(', ')}
          </div>
        )}

        {finding.dismissed_reason && (
          <div className="rounded border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">
            <strong>Dismissed because: </strong>
            {finding.dismissed_reason}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {isOpen && !showDismiss && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={callAck}
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              Acknowledge
            </button>
            <button
              type="button"
              onClick={callFixed}
              disabled={isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark fixed
            </button>
            <button
              type="button"
              onClick={() => setShowDismiss(true)}
              className="text-xs text-zinc-600 hover:text-zinc-900"
            >
              Dismiss…
            </button>
          </div>
        )}

        {isOpen && showDismiss && (
          <form action={dismissFormAction} className="space-y-2">
            <input
              type="text"
              name="reason"
              required
              placeholder="Reason (recorded for audit log)"
              className="block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs"
            />
            {dismissErrors.reason && (
              <p className="text-xs text-red-600">{dismissErrors.reason[0]}</p>
            )}
            {dismissMessage && (
              <p className="text-xs text-red-600">{dismissMessage}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isDismissing}
                className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {isDismissing ? 'Dismissing…' : 'Dismiss'}
              </button>
              <button
                type="button"
                onClick={() => setShowDismiss(false)}
                className="text-xs text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isTerminal && (
          <p className="text-xs text-zinc-500">
            Status: {FH_FINDING_STATUS_LABELS[finding.status]}
          </p>
        )}
      </div>
    </details>
  )
}
