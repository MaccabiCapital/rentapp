'use client'

import { useState, useTransition } from 'react'
import { deleteTeamMember } from '@/app/actions/team'
import { ConfirmDialog } from './confirm-dialog'

export function DeleteTeamMemberButton({
  memberId,
  memberName,
}: {
  memberId: string
  memberName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteTeamMember(memberId)
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
            {isPending ? 'Removing…' : 'Remove from team'}
          </button>
        }
        title={`Remove ${memberName} from your team?`}
        description="This hides them from all pickers and the list. You can restore them by contacting support. Consider toggling them to Inactive instead if you might use them again."
        confirmLabel="Remove"
        onConfirm={handleConfirm}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
