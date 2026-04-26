'use client'

import { useActionState } from 'react'
import { completeRecurringTask } from '@/app/actions/recurring-maintenance'
import { emptyActionState } from '@/app/lib/types'

export function CompleteRecurringTaskForm({
  taskId,
}: {
  taskId: string
}) {
  const action = completeRecurringTask.bind(null, taskId)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form
      action={formAction}
      className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-emerald-900">
        Mark complete
      </h3>
      <p className="mt-1 text-xs text-emerald-800">
        Logs the completion + advances next-due date by the task&rsquo;s
        frequency.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-emerald-900">
            Date completed
          </label>
          <input
            type="date"
            name="completed_on"
            required
            defaultValue={today}
            className="mt-1 block w-full rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {errors.completed_on && (
            <p className="mt-1 text-xs text-red-600">
              {errors.completed_on[0]}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-900">
            Vendor used (optional)
          </label>
          <input
            type="text"
            name="vendor_used"
            placeholder="e.g., Joe's HVAC"
            className="mt-1 block w-full rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-900">
            Cost (optional, $)
          </label>
          <input
            type="number"
            name="cost_dollars"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="mt-1 block w-full rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {errors.cost_cents && (
            <p className="mt-1 text-xs text-red-600">{errors.cost_cents[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-900">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="What was done, anything notable, what to watch next time."
            className="mt-1 block w-full rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {message}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {justSaved && (
          <span className="text-xs text-emerald-700">Logged.</span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isPending ? 'Logging…' : 'Mark complete'}
        </button>
      </div>
    </form>
  )
}
