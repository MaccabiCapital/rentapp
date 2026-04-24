'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateDraftForConversation } from '@/app/actions/leasing'

export function LeasingGenerateButton({
  conversationId,
  mode,
}: {
  conversationId: string
  mode: 'stub' | 'live'
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await generateDraftForConversation(conversationId)
          router.refresh()
        })
      }}
      disabled={isPending}
      className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:bg-purple-400"
      title={
        mode === 'stub'
          ? 'Stub mode — will produce a canned placeholder draft'
          : 'Generate an AI-drafted reply for review'
      }
    >
      {isPending ? 'Drafting…' : 'Generate AI draft'}
    </button>
  )
}
