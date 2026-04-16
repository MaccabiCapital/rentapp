'use client'

import { useState, useTransition } from 'react'
import {
  assignTriageToTenant,
  dismissTriage,
} from '@/app/actions/sms-identities'

export function TriageItemActions({
  commId,
  phoneNumber,
  tenantOptions,
}: {
  commId: string
  phoneNumber: string
  tenantOptions: Array<{ id: string; name: string; unit_label: string | null }>
}) {
  const [tenantId, setTenantId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAssign() {
    if (!tenantId) return
    setError(null)
    startTransition(async () => {
      const res = await assignTriageToTenant(commId, tenantId, phoneNumber)
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Could not assign.')
      }
    })
  }

  function handleDismiss() {
    setError(null)
    startTransition(async () => {
      const res = await dismissTriage(commId)
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Could not dismiss.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          disabled={isPending}
          className="min-w-[14rem] rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">— assign to tenant —</option>
          {tenantOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.unit_label ? ` · ${t.unit_label}` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!tenantId || isPending}
          className="rounded-md bg-indigo-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Assign'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
