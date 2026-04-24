'use client'

// ============================================================
// Header action buttons — mark complete, re-open, delete, print
// ============================================================

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  markInspectionComplete,
  reopenInspection,
  deleteInspection,
} from '@/app/actions/inspections'
import type { InspectionStatus } from '@/app/lib/schemas/inspection'

export function InspectionHeaderActions({
  inspectionId,
  status,
  totalItems,
  ratedItems,
}: {
  inspectionId: string
  status: InspectionStatus
  totalItems: number
  ratedItems: number
}) {
  const router = useRouter()
  const [isCompleting, startComplete] = useTransition()
  const [isReopening, startReopen] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canComplete =
    status === 'draft' || status === 'in_progress'
  const isLocked = status === 'completed' || status === 'signed'
  const allRated = totalItems > 0 && ratedItems === totalItems

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <a
        href={`/dashboard/inspections/${inspectionId}/pdf`}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
      >
        Download PDF
      </a>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
      >
        Print
      </button>

      {canComplete && (
        <button
          type="button"
          onClick={() => {
            if (!allRated) {
              const ok = window.confirm(
                `Not all items are rated (${ratedItems} of ${totalItems}). Mark complete anyway?`,
              )
              if (!ok) return
            }
            startComplete(async () => {
              await markInspectionComplete(inspectionId)
              router.refresh()
            })
          }}
          disabled={isCompleting}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isCompleting ? 'Marking complete…' : 'Mark complete'}
        </button>
      )}

      {isLocked && (
        <button
          type="button"
          onClick={() => {
            startReopen(async () => {
              await reopenInspection(inspectionId)
              router.refresh()
            })
          }}
          disabled={isReopening}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:text-zinc-400"
        >
          {isReopening ? 'Re-opening…' : 'Re-open for edits'}
        </button>
      )}

      {confirmDelete ? (
        <span className="flex items-center gap-2">
          <span className="text-sm text-zinc-700">Delete this inspection?</span>
          <button
            type="button"
            onClick={() => {
              startDelete(async () => {
                await deleteInspection(inspectionId)
              })
            }}
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
          >
            {isDeleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="text-sm text-zinc-500 hover:text-red-600"
        >
          Delete
        </button>
      )}
    </div>
  )
}
