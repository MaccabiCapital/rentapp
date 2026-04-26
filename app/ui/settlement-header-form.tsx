'use client'

// ============================================================
// Settlement header form — forwarding address + notes
// ============================================================
//
// Editable while the settlement is in draft. Renders read-only
// summary once finalized or mailed.

import { useActionState } from 'react'
import { updateSettlement } from '@/app/actions/security-deposits'
import { emptyActionState } from '@/app/lib/types'

type Initial = {
  forwarding_street_address: string | null
  forwarding_unit: string | null
  forwarding_city: string | null
  forwarding_state: string | null
  forwarding_postal_code: string | null
  notes: string | null
}

export function SettlementHeaderForm({
  settlementId,
  initial,
  isDraft,
}: {
  settlementId: string
  initial: Initial
  isDraft: boolean
}) {
  const action = updateSettlement.bind(null, settlementId)
  const [state, formAction, isPending] = useActionState(action, emptyActionState)
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  if (!isDraft) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">
          Forwarding address
        </h3>
        <div className="mt-3 text-sm text-zinc-700">
          {initial.forwarding_street_address ? (
            <>
              <div>
                {initial.forwarding_street_address}
                {initial.forwarding_unit ? ` ${initial.forwarding_unit}` : ''}
              </div>
              <div>
                {[
                  initial.forwarding_city,
                  initial.forwarding_state,
                  initial.forwarding_postal_code,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </div>
            </>
          ) : (
            <span className="text-zinc-400">Not recorded</span>
          )}
        </div>
        {initial.notes && (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <div className="text-xs font-medium text-zinc-500">
              Internal notes
            </div>
            <p className="mt-1 text-sm text-zinc-700">{initial.notes}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-zinc-900">
        Forwarding address
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Where to mail the deposit accounting letter. Pre-filled from the
        tenant&rsquo;s record if you captured it at notice.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="forwarding_street_address"
            className="block text-xs font-medium text-zinc-700"
          >
            Street address
          </label>
          <input
            type="text"
            id="forwarding_street_address"
            name="forwarding_street_address"
            defaultValue={initial.forwarding_street_address ?? ''}
            placeholder="123 Main St"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.forwarding_street_address && (
            <p className="mt-1 text-xs text-red-600">
              {errors.forwarding_street_address[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="forwarding_unit"
            className="block text-xs font-medium text-zinc-700"
          >
            Unit / apt <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            id="forwarding_unit"
            name="forwarding_unit"
            defaultValue={initial.forwarding_unit ?? ''}
            placeholder="Apt 4B"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label
              htmlFor="forwarding_city"
              className="block text-xs font-medium text-zinc-700"
            >
              City
            </label>
            <input
              type="text"
              id="forwarding_city"
              name="forwarding_city"
              defaultValue={initial.forwarding_city ?? ''}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="forwarding_state"
              className="block text-xs font-medium text-zinc-700"
            >
              State
            </label>
            <input
              type="text"
              id="forwarding_state"
              name="forwarding_state"
              maxLength={2}
              defaultValue={initial.forwarding_state ?? ''}
              placeholder="TX"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm uppercase shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="forwarding_postal_code"
            className="block text-xs font-medium text-zinc-700"
          >
            ZIP / postal code
          </label>
          <input
            type="text"
            id="forwarding_postal_code"
            name="forwarding_postal_code"
            defaultValue={initial.forwarding_postal_code ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <label
            htmlFor="notes"
            className="block text-xs font-medium text-zinc-700"
          >
            Internal notes <span className="text-zinc-400">(not on PDF)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial.notes ?? ''}
            placeholder="Anything you want to remember about this settlement…"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <span className="text-xs text-emerald-700">Saved.</span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
