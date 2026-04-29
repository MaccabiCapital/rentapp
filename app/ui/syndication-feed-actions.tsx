'use client'

// ============================================================
// Syndication feed enable/disable/rotate actions
// ============================================================

import { useTransition } from 'react'
import {
  enableSyndicationFeed,
  disableSyndicationFeed,
  rotateSyndicationToken,
} from '@/app/actions/syndication-feed'

type State = 'absent' | 'disabled' | 'enabled'

export function SyndicationFeedActions({ state }: { state: State }) {
  const [isPending, startTransition] = useTransition()

  if (state === 'absent') {
    return (
      <button
        type="button"
        onClick={() => startTransition(async () => {
            await enableSyndicationFeed()
          })}
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {isPending ? 'Enabling…' : 'Enable syndication'}
      </button>
    )
  }

  if (state === 'disabled') {
    return (
      <button
        type="button"
        onClick={() => startTransition(async () => {
            await enableSyndicationFeed()
          })}
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {isPending ? 'Re-enabling…' : 'Re-enable syndication'}
      </button>
    )
  }

  // state === 'enabled'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (
            !confirm(
              'Rotate the feed token? Aggregators using the old URL will get 404 until you resubmit. Use this if a token leaked.',
            )
          )
            return
          startTransition(async () => {
            await rotateSyndicationToken()
          })
        }}
        disabled={isPending}
        className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
      >
        {isPending ? 'Working…' : 'Rotate token'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (
            !confirm(
              'Disable syndication? The feed URL will return 404 until you re-enable it. Active aggregators will stop seeing your listings within ~24 hours.',
            )
          )
            return
          startTransition(async () => {
            await disableSyndicationFeed()
          })
        }}
        disabled={isPending}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        {isPending ? 'Working…' : 'Disable'}
      </button>
    </div>
  )
}
