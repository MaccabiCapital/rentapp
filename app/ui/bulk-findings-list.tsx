'use client'

// ============================================================
// Bulk findings list — checkboxes + bulk acknowledge / dismiss
// ============================================================
//
// Wraps the existing ComplianceFindingRow with a checkbox column
// and a sticky action bar that appears when at least one finding
// is selected.

import { useState, useTransition } from 'react'
import {
  bulkAcknowledgeFindings,
  bulkDismissFindings,
} from '@/app/actions/compliance'
import { ComplianceFindingRow } from './compliance-finding-row'
import type { ComplianceFinding } from '@/app/lib/schemas/compliance'

export function BulkFindingsList({
  findings,
}: {
  findings: ComplianceFinding[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showDismiss, setShowDismiss] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(findings.map((f) => f.id)))
    else setSelected(new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function callBulkAck() {
    setError(null)
    startTransition(async () => {
      const result = await bulkAcknowledgeFindings(Array.from(selected))
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Failed.')
      } else {
        setSelected(new Set())
      }
    })
  }

  function callBulkDismiss() {
    if (dismissReason.trim().length === 0) {
      setError('Reason is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await bulkDismissFindings(
        Array.from(selected),
        dismissReason,
      )
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Failed.')
      } else {
        setSelected(new Set())
        setShowDismiss(false)
        setDismissReason('')
      }
    })
  }

  const allSelected = findings.length > 0 && selected.size === findings.length
  const someSelected = selected.size > 0

  return (
    <div>
      {/* Bulk action bar — appears when at least one is selected */}
      {someSelected && (
        <div className="mb-3 sticky top-2 z-10 rounded-md border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-indigo-900">
              {selected.size} selected
            </span>

            {!showDismiss && (
              <>
                <button
                  type="button"
                  onClick={callBulkAck}
                  disabled={isPending}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  {isPending ? 'Working…' : 'Acknowledge selected'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDismiss(true)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  Dismiss selected…
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Clear
                </button>
              </>
            )}

            {showDismiss && (
              <>
                <input
                  type="text"
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="Reason (recorded for audit)"
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={callBulkDismiss}
                  disabled={isPending}
                  className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isPending ? 'Dismissing…' : 'Confirm dismiss'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDismiss(false)
                    setDismissReason('')
                  }}
                  className="text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* Select-all toggle */}
      {findings.length > 0 && (
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            aria-label="Select all findings"
          />
          <span>{allSelected ? 'All selected' : 'Select all'}</span>
        </div>
      )}

      <div className="space-y-2">
        {findings.map((f) => (
          <div key={f.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selected.has(f.id)}
              onChange={(e) => toggleOne(f.id, e.target.checked)}
              className="mt-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Select ${f.title}`}
            />
            <div className="flex-1">
              <ComplianceFindingRow finding={f} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
