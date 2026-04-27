'use client'

import { useState, useTransition } from 'react'
import { requestTenantSignature } from '@/app/actions/lease-signatures'

export function RequestTenantSignatureButton({
  leaseId,
  label = 'Send for tenant signature',
}: {
  leaseId: string
  label?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await requestTenantSignature(leaseId)
            if (result.success === false && 'message' in result) {
              setError(result.message ?? 'Failed.')
            }
          })
        }}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {isPending ? 'Generating…' : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
