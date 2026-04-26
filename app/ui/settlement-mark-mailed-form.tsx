'use client'

// ============================================================
// Mark settlement as mailed
// ============================================================
//
// Captures method (first-class, certified, hand-delivered,
// electronic), tracking number (optional), and date sent.

import { useActionState, useState, useTransition } from 'react'
import {
  markSettlementMailed,
  unfinalizeSettlement,
} from '@/app/actions/security-deposits'
import { emptyActionState } from '@/app/lib/types'
import {
  MAIL_METHOD_VALUES,
  MAIL_METHOD_LABELS,
} from '@/app/lib/schemas/security-deposit'

export function SettlementMarkMailedForm({
  settlementId,
}: {
  settlementId: string
}) {
  const action = markSettlementMailed.bind(null, settlementId)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  const [unfinalizeError, setUnfinalizeError] = useState<string | null>(null)
  const [isUnfinalizing, startUnfinalize] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Mark as mailed
        </h3>
        <button
          type="button"
          onClick={() => {
            if (
              !confirm('Unfinalize? This unlocks the itemization for editing.')
            )
              return
            setUnfinalizeError(null)
            startUnfinalize(async () => {
              const result = await unfinalizeSettlement(settlementId)
              if (result.success === false && 'message' in result) {
                setUnfinalizeError(result.message ?? 'Could not unfinalize.')
              }
            })
          }}
          disabled={isUnfinalizing}
          className="text-xs text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        >
          {isUnfinalizing ? 'Unfinalizing…' : 'Unfinalize (edit again)'}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Once you record this as mailed, the legal clock is satisfied. Make
        sure the PDF was actually printed and mailed first.
      </p>

      {unfinalizeError && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {unfinalizeError}
        </p>
      )}

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="mail_method"
            className="block text-xs font-medium text-zinc-700"
          >
            Mailing method
          </label>
          <select
            id="mail_method"
            name="mail_method"
            required
            defaultValue="certified_mail"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {MAIL_METHOD_VALUES.map((m) => (
              <option key={m} value={m}>
                {MAIL_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {errors.mail_method && (
            <p className="mt-1 text-xs text-red-600">{errors.mail_method[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="mailed_on"
              className="block text-xs font-medium text-zinc-700"
            >
              Date mailed
            </label>
            <input
              type="date"
              id="mailed_on"
              name="mailed_on"
              required
              defaultValue={today}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.mailed_on && (
              <p className="mt-1 text-xs text-red-600">
                {errors.mailed_on[0]}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="mail_tracking_number"
              className="block text-xs font-medium text-zinc-700"
            >
              Tracking number{' '}
              <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              id="mail_tracking_number"
              name="mail_tracking_number"
              placeholder="USPS / FedEx / UPS"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {message && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isPending ? 'Recording…' : 'Mark as mailed'}
          </button>
        </div>
      </form>
    </div>
  )
}
