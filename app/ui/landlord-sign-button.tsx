'use client'

// ============================================================
// Landlord-sign modal — typed name + signature pad
// ============================================================

import { useActionState, useState } from 'react'
import { signLeaseAsLandlord } from '@/app/actions/lease-signatures'
import { emptyActionState } from '@/app/lib/types'
import { SignaturePad } from './signature-pad'

export function LandlordSignButton({ leaseId }: { leaseId: string }) {
  const [open, setOpen] = useState(false)
  const action = signLeaseAsLandlord.bind(null, leaseId)
  const [state, formAction, isPending] = useActionState(action, emptyActionState)
  const [hasSignature, setHasSignature] = useState(false)

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  // Close modal on success
  if (state.success && open) {
    // The action revalidated the path; close the modal asynchronously.
    setTimeout(() => setOpen(false), 0)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
      >
        Sign as landlord
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-6">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            Sign as landlord
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-zinc-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700">
              Your full legal name
            </label>
            <input
              type="text"
              name="typed_name"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.typed_name && (
              <p className="mt-1 text-xs text-red-600">{errors.typed_name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700">
              Draw your signature
            </label>
            <div className="mt-1">
              <SignaturePad
                name="signature_data_url"
                onChange={(url) => setHasSignature(!!url)}
              />
            </div>
            {errors.signature_data_url && (
              <p className="mt-1 text-xs text-red-600">
                {errors.signature_data_url[0]}
              </p>
            )}
          </div>

          {message && (
            <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !hasSignature}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isPending ? 'Signing…' : 'Sign lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
