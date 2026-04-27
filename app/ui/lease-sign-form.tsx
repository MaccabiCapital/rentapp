'use client'

// ============================================================
// Tenant lease-sign form (public)
// ============================================================

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  recordTenantSignature,
  type PublicSignResult,
} from '@/app/actions/lease-signatures'
import { SignaturePad } from './signature-pad'

const INITIAL: PublicSignResult = { success: false, message: '' }

export function LeaseSignForm({
  token,
  suggestedName,
}: {
  token: string
  suggestedName: string
}) {
  const router = useRouter()
  const action = recordTenantSignature.bind(null, token)
  const [state, formAction, isPending] = useActionState<
    PublicSignResult,
    FormData
  >(action, INITIAL)

  const [hasSignature, setHasSignature] = useState(false)

  // On success, navigate to /done page
  if (state.success && 'redirectTo' in state) {
    router.push(state.redirectTo)
  }

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="typed_name"
          className="block text-sm font-medium text-zinc-700"
        >
          Full legal name
        </label>
        <input
          type="text"
          id="typed_name"
          name="typed_name"
          required
          defaultValue={suggestedName}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors.typed_name && (
          <p className="mt-1 text-xs text-red-600">{errors.typed_name[0]}</p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          Type the same name that appears on the lease.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
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

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>By signing, you agree:</strong> your typed name and the
        signature you draw above have the same legal effect as a
        handwritten signature on paper. Your signature, IP address, browser,
        and the time of signing are recorded.
      </div>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !hasSignature}
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Submitting…' : 'Sign lease'}
        </button>
      </div>
    </form>
  )
}
