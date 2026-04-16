'use client'

import { useState, useTransition } from 'react'
import { deleteInsurancePolicy } from '@/app/actions/insurance'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteInsuranceButton({
  policyId,
  label,
}: {
  policyId: string
  label: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteInsurancePolicy(policyId)
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
            {isPending ? 'Deleting…' : 'Delete policy'}
          </button>
        }
        title={`Delete ${label}?`}
        description="This archives the policy and removes it from dashboards. You can restore it by contacting support."
        confirmLabel="Delete"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
