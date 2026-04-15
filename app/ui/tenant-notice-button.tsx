'use client'

// ============================================================
// TenantNoticeButton — record / clear a tenant's notice to vacate
// ============================================================

import { useState, useTransition } from 'react'
import {
  recordTenantNotice,
  clearTenantNotice,
} from '@/app/actions/leases'

export function TenantNoticeButton({
  leaseId,
  currentNoticeDate,
}: {
  leaseId: string
  currentNoticeDate: string | null
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateValue, setDateValue] = useState(
    new Date().toISOString().slice(0, 10),
  )

  function handleRecord() {
    setError(null)
    startTransition(async () => {
      const result = await recordTenantNotice(leaseId, dateValue)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
      setShowDatePicker(false)
    })
  }

  function handleClear() {
    setError(null)
    startTransition(async () => {
      const result = await clearTenantNotice(leaseId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  if (currentNoticeDate) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Notice given · {currentNoticeDate}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Clear
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (showDatePicker) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleRecord}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Record'}
          </button>
          <button
            type="button"
            onClick={() => setShowDatePicker(false)}
            disabled={isPending}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowDatePicker(true)}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
    >
      Record tenant notice
    </button>
  )
}
