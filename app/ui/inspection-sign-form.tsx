'use client'

// ============================================================
// Signature capture — typed-name signatures for v1
// ============================================================
//
// Tenant and landlord each type their full name and submit.
// Status flips to 'signed' when both have signed.

import { useActionState } from 'react'
import { signInspection } from '@/app/actions/inspections'
import { emptyActionState } from '@/app/lib/types'

export function InspectionSignForm({
  inspectionId,
  party,
  alreadySigned,
  signedName,
  signedAt,
}: {
  inspectionId: string
  party: 'tenant' | 'landlord'
  alreadySigned: boolean
  signedName: string | null
  signedAt: string | null
}) {
  const bound = signInspection.bind(null, inspectionId)
  const [state, formAction, isPending] = useActionState(bound, emptyActionState)
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  const label = party === 'tenant' ? 'Tenant signature' : 'Landlord signature'

  if (alreadySigned && signedAt) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          {label}
        </div>
        <div className="mt-1 text-sm text-emerald-900">
          Signed by <span className="font-medium">{signedName ?? '—'}</span>
        </div>
        <div className="text-xs text-emerald-700">
          {new Date(signedAt).toLocaleString('en-US')}
        </div>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="rounded-md border border-zinc-200 bg-white p-3"
    >
      <input type="hidden" name="party" value={party} />
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          name="name"
          placeholder="Type full name to sign"
          required
          className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isPending ? 'Signing…' : 'Sign'}
        </button>
      </div>
      {errors.name && (
        <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>
      )}
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </form>
  )
}
