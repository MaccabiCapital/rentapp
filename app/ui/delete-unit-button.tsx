'use client'

// ============================================================
// DeleteUnitButton — confirm-wrapped unit delete trigger
// ============================================================

import { useState, useTransition } from 'react'
import { deleteUnit } from '@/app/actions/units'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteUnitButton({
  unitId,
  propertyId,
  unitLabel,
  variant = 'button',
}: {
  unitId: string
  propertyId: string
  unitLabel: string
  variant?: 'button' | 'link'
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteUnit(unitId, propertyId)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  const triggerClasses =
    variant === 'button'
      ? 'rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
      : 'text-sm text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <button type="button" disabled={isPending} className={triggerClasses}>
            {isPending ? 'Deleting…' : variant === 'link' ? 'Delete' : 'Delete unit'}
          </button>
        }
        title={`Delete ${unitLabel}?`}
        description="This action can be undone by contacting support within 30 days. The unit will be hidden from all views immediately."
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
