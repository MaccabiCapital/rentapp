'use client'

import { useState, useTransition } from 'react'
import {
  setTaskStatus,
  deleteRecurringTask,
} from '@/app/actions/recurring-maintenance'
import type { TaskStatus } from '@/app/lib/schemas/recurring-maintenance'

export function RecurringTaskActions({
  taskId,
  status,
}: {
  taskId: string
  status: TaskStatus
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setStatus(newStatus: TaskStatus) {
    setError(null)
    startTransition(async () => {
      const result = await setTaskStatus(taskId, newStatus)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Failed.')
      }
    })
  }

  function deleteTask() {
    if (!confirm('Delete this task and its completion history?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteRecurringTask(taskId)
      if (result.success === false && 'message' in result) {
        setError(result.message ?? 'Delete failed.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {status === 'active' && (
          <button
            type="button"
            onClick={() => setStatus('paused')}
            disabled={isPending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Pause
          </button>
        )}
        {status === 'paused' && (
          <button
            type="button"
            onClick={() => setStatus('active')}
            disabled={isPending}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
          >
            Resume
          </button>
        )}
        {status !== 'archived' && (
          <button
            type="button"
            onClick={() => setStatus('archived')}
            disabled={isPending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Archive
          </button>
        )}
        {status === 'archived' && (
          <button
            type="button"
            onClick={() => setStatus('active')}
            disabled={isPending}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}
        <button
          type="button"
          onClick={deleteTask}
          disabled={isPending}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
