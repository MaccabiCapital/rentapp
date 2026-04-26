'use client'

// ============================================================
// Tenant forwarding address card
// ============================================================
//
// Lives on the tenant detail page. Captures where to mail the
// security deposit accounting letter after move-out. Best filled
// in when the tenant gives notice — the deposit settlement
// generator will copy it onto the letter.

import { useActionState } from 'react'
import { updateTenantForwarding } from '@/app/actions/security-deposits'
import { emptyActionState } from '@/app/lib/types'

type Initial = {
  forwarding_street_address: string | null
  forwarding_unit: string | null
  forwarding_city: string | null
  forwarding_state: string | null
  forwarding_postal_code: string | null
  forwarding_captured_at: string | null
}

export function TenantForwardingCard({
  tenantId,
  initial,
}: {
  tenantId: string
  initial: Initial
}) {
  const action = updateTenantForwarding.bind(null, tenantId)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  const hasAddress = Boolean(initial.forwarding_street_address)

  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Forwarding address
        </h3>
        {hasAddress && (
          <span className="text-xs text-emerald-700">On file</span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Where to mail the deposit accounting letter after move-out. Best
        captured when the tenant gives notice.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
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

        {Object.keys(errors).length > 0 && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            Couldn&rsquo;t save — check the fields above.
          </p>
        )}
        {message && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {message}
          </p>
        )}

        <div className="flex items-center justify-between">
          {justSaved ? (
            <span className="text-xs text-emerald-700">Saved.</span>
          ) : initial.forwarding_captured_at ? (
            <span className="text-xs text-zinc-400">
              Last updated{' '}
              {new Date(initial.forwarding_captured_at).toLocaleDateString(
                'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' },
              )}
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isPending ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </form>
    </div>
  )
}
