'use client'

import { useState, useTransition } from 'react'
import { provisionSupportLine } from '@/app/actions/phone-lines'

export function ProvisionSupportLineButton() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await provisionSupportLine()
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Provisioning…' : 'Set up support line'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
