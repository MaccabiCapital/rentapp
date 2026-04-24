'use client'

// ============================================================
// Mark-served form — record when + how a notice was delivered
// ============================================================

import { useActionState } from 'react'
import { markNoticeServed } from '@/app/actions/notices'
import {
  NOTICE_METHOD_VALUES,
  NOTICE_METHOD_LABELS,
} from '@/app/lib/schemas/notice'
import { emptyActionState } from '@/app/lib/types'

export function NoticeServedForm({
  noticeId,
  defaultServedAt,
  defaultMethod,
  defaultNotes,
  alreadyServed,
}: {
  noticeId: string
  defaultServedAt?: string
  defaultMethod?: string
  defaultNotes?: string
  alreadyServed: boolean
}) {
  const bound = markNoticeServed.bind(null, noticeId)
  const [state, formAction, isPending] = useActionState(bound, emptyActionState)
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-md border border-zinc-200 bg-white p-4"
    >
      <div className="text-sm font-semibold text-zinc-900">
        {alreadyServed ? 'Update delivery record' : 'Mark as served'}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="served_at"
            className="block text-xs font-medium text-zinc-600"
          >
            Date served
          </label>
          <input
            type="date"
            id="served_at"
            name="served_at"
            required
            defaultValue={defaultServedAt}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.served_at && (
            <p className="mt-1 text-xs text-red-600">{errors.served_at[0]}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="served_method"
            className="block text-xs font-medium text-zinc-600"
          >
            Method
          </label>
          <select
            id="served_method"
            name="served_method"
            required
            defaultValue={defaultMethod ?? 'hand_delivery'}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {NOTICE_METHOD_VALUES.map((m) => (
              <option key={m} value={m}>
                {NOTICE_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {errors.served_method && (
            <p className="mt-1 text-xs text-red-600">
              {errors.served_method[0]}
            </p>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-medium text-zinc-600"
        >
          Notes <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaultNotes}
          placeholder="Delivered in person at front door, tenant acknowledged receipt"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {message && <p className="text-xs text-red-600">{message}</p>}

      <div className="flex items-center justify-end gap-2">
        {justSaved && (
          <span className="text-xs text-emerald-600">Saved</span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isPending ? 'Saving…' : alreadyServed ? 'Update' : 'Mark as served'}
        </button>
      </div>
    </form>
  )
}
