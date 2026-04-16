'use client'

import { useActionState, useRef, useEffect } from 'react'
import { linkPhoneToTenant } from '@/app/actions/sms-identities'
import type { ActionState } from '@/app/lib/types'

export function LinkPhoneForm({ tenantId }: { tenantId: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    linkPhoneToTenant,
    { success: true },
  )

  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state && 'success' in state && state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state])

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const message = state && !state.success && 'message' in state ? state.message : null

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[14rem]">
          <label
            htmlFor="phone_number"
            className="block text-xs font-medium text-zinc-700"
          >
            Link a phone number
          </label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            required
            placeholder="617 555 0123"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.phone_number && (
            <p className="mt-1 text-xs text-red-600">
              {errors.phone_number.join(' ')}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Linking…' : 'Link'}
        </button>
      </div>
      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {message}
        </div>
      )}
    </form>
  )
}
