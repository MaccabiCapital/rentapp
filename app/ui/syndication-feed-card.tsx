'use client'

// ============================================================
// Syndication feed management card — on the Listings list page
// ============================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateSyndicationFeedToken,
  revokeSyndicationFeedToken,
} from '@/app/actions/syndication'

export function SyndicationFeedCard({
  token,
  generatedAt,
}: {
  token: string | null
  generatedAt: string | null
}) {
  const [isGenerating, startGenerating] = useTransition()
  const [isRevoking, startRevoking] = useTransition()
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const feedUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/api/listings/feed/${token}/route.xml`
      : token
        ? `/api/listings/feed/${token}/route.xml`
        : null

  async function handleCopy() {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            📡 Syndication feed (Zillow / aggregators)
          </h3>
          <p className="mt-0.5 text-xs text-zinc-600">
            Share one XML feed URL with Zillow Rental Manager and other sites
            that accept ILS feeds. Every active listing syndicates
            automatically.
            {token && (
              <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                ACTIVE
              </span>
            )}
          </p>
        </div>
        <span className="text-xs text-zinc-400">
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {expanded && (
        <div className="mt-3">
          {!token ? (
            <button
              type="button"
              onClick={() => {
                startGenerating(async () => {
                  await generateSyndicationFeedToken()
                  router.refresh()
                })
              }}
              disabled={isGenerating}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isGenerating ? 'Generating…' : 'Generate feed URL'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={feedUrl ?? ''}
                    className="block w-full bg-transparent font-mono text-xs text-zinc-700 focus:outline-none"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Paste this URL into Zillow Rental Manager → Feed URL. Your
                active listings update automatically. Generated{' '}
                {generatedAt
                  ? new Date(generatedAt).toLocaleString('en-US')
                  : '—'}
                .
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    startGenerating(async () => {
                      await generateSyndicationFeedToken()
                      router.refresh()
                    })
                  }}
                  disabled={isGenerating}
                  className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {isGenerating ? 'Regenerating…' : 'Regenerate (rotates URL)'}
                </button>
                {confirmRevoke ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-zinc-700">
                      Stop publishing feed?
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        startRevoking(async () => {
                          await revokeSyndicationFeedToken()
                          router.refresh()
                        })
                      }
                      disabled={isRevoking}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {isRevoking ? 'Revoking…' : 'Yes, revoke'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(false)}
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(true)}
                    className="text-xs text-zinc-500 hover:text-red-600"
                  >
                    Revoke feed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
