'use client'

import { useTransition } from 'react'
import { revokeApiKey } from '@/app/actions/api-keys'

export function RevokeApiKeyButton({ keyId }: { keyId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => {
        if (
          !confirm(
            'Revoke this API key? Any scripts or integrations using it will get 401 immediately.',
          )
        )
          return
        startTransition(async () => {
          await revokeApiKey(keyId)
        })
      }}
      disabled={isPending}
      className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {isPending ? 'Revoking…' : 'Revoke'}
    </button>
  )
}
