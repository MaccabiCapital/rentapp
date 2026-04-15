'use client'

import { useState, useTransition } from 'react'
import { deleteTenant } from '@/app/actions/tenants'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteTenantButton({
  tenantId,
  tenantName,
}: {
  tenantId: string
  tenantName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteTenant(tenantId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={isPending}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete tenant'}
          </button>
        }
        title={`Delete ${tenantName}?`}
        description="This action can be undone by contacting support within 30 days. The tenant will be hidden from all views immediately."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
