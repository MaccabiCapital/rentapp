'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  MANUAL_INCOME_METHODS,
  MANUAL_INCOME_METHOD_LABELS,
} from '@/app/lib/schemas/expense'

type LeaseOption = {
  id: string
  label: string // "Property · Unit · Tenant name"
  suggested_rent: number
}

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  leaseOptions: LeaseOption[]
}

export function ManualPaymentForm({ action, leaseOptions }: Props) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      {leaseOptions.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Create a lease first — you need an active lease before you can
          record rent received.
        </div>
      ) : (
        <div>
          <label
            htmlFor="lease_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Lease<span className="ml-0.5 text-red-600">*</span>
          </label>
          <select
            id="lease_id"
            name="lease_id"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— pick a lease —</option>
            {leaseOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          {errors.lease_id && (
            <p className="mt-1 text-sm text-red-600">
              {errors.lease_id.join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-zinc-900"
          >
            Amount<span className="ml-0.5 text-red-600">*</span>
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
              $
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.join(' ')}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="received_on"
            className="block text-sm font-medium text-zinc-900"
          >
            Date received<span className="ml-0.5 text-red-600">*</span>
          </label>
          <input
            id="received_on"
            name="received_on"
            type="date"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.received_on && (
            <p className="mt-1 text-sm text-red-600">
              {errors.received_on.join(' ')}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="payment_method"
          className="block text-sm font-medium text-zinc-900"
        >
          Payment method<span className="ml-0.5 text-red-600">*</span>
        </label>
        <select
          id="payment_method"
          name="payment_method"
          defaultValue="zelle"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {MANUAL_INCOME_METHODS.map((m) => (
            <option key={m} value={m}>
              {MANUAL_INCOME_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || leaseOptions.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}
