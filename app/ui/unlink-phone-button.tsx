'use client'

import { useState, useTransition } from 'react'
import { unlinkPhone } from '@/app/actions/sms-identities'

export function UnlinkPhoneButton({ identityId }: { identityId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Remove this phone number from the tenant?')) return
    setError(null)
    startTransition(async () => {
      const res = await unlinkPhone(identityId)
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Failed to unlink.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Removing…' : 'Unlink'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
