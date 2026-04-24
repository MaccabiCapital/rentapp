'use client'

import { useState, useTransition } from 'react'
import { deleteNotice } from '@/app/actions/notices'

export function NoticeDeleteButton({ noticeId }: { noticeId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-sm text-zinc-500 hover:text-red-600"
      >
        Delete notice
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-zinc-700">Delete this notice?</span>
      <button
        type="button"
        onClick={() => {
          startTransition(async () => {
            await deleteNotice(noticeId)
          })
        }}
        disabled={isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
      >
        {isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        Cancel
      </button>
    </span>
  )
}
