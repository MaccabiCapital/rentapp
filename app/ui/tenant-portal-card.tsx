'use client'

// ============================================================
// Tenant portal access card — landlord-side
// ============================================================
//
// Shows on the tenant detail page. Two states:
//   1. No token → "Generate portal link"
//   2. Token exists → show the URL, Copy button, Regenerate, Revoke
//
// The URL uses window.location.origin so it works in dev + prod
// without env wiring.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateTenantPortalToken,
  revokeTenantPortalToken,
} from '@/app/actions/tenant-portal'

export function TenantPortalCard({
  tenantId,
  token,
  generatedAt,
}: {
  tenantId: string
  token: string | null
  generatedAt: string | null
}) {
  const [isGenerating, startGenerating] = useTransition()
  const [isRevoking, startRevoking] = useTransition()
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const router = useRouter()

  const portalUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/portal/t/${token}`
      : token
        ? `/portal/t/${token}`
        : null

  async function handleCopy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback — just show it
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Tenant portal access
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            Give this tenant a read-only portal link to view their lease,
            notices, and insurance status. The URL itself is the credential —
            share it over email or text. Regenerating replaces the link.
          </p>
        </div>
      </div>

      {!token ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              startGenerating(async () => {
                await generateTenantPortalToken(tenantId)
                router.refresh()
              })
            }}
            disabled={isGenerating}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isGenerating ? 'Generating…' : 'Generate portal link'}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={portalUrl ?? ''}
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
          {generatedAt && (
            <div className="text-xs text-zinc-500">
              Generated {new Date(generatedAt).toLocaleString('en-US')}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                startGenerating(async () => {
                  await generateTenantPortalToken(tenantId)
                  router.refresh()
                })
              }}
              disabled={isGenerating}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:text-zinc-400"
            >
              {isGenerating ? 'Regenerating…' : 'Regenerate link'}
            </button>
            {confirmRevoke ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-zinc-700">
                  Revoke portal access?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    startRevoking(async () => {
                      await revokeTenantPortalToken(tenantId)
                      router.refresh()
                    })
                  }}
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
                Revoke access
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
