'use client'

// ============================================================
// API key generator — shows the full secret ONCE
// ============================================================

import { useState, useTransition } from 'react'
import {
  generateApiKey,
  type GenerateKeyResult,
} from '@/app/actions/api-keys'

export function ApiKeyManager() {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'read' | 'write'>('read')
  const [revealed, setRevealed] = useState<{
    secret: string
    last4: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onGenerate = () => {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', name)
      fd.set('scopes', scope)
      const result: GenerateKeyResult = await generateApiKey(fd)
      if (!result.success) {
        setError(result.message)
        return
      }
      setRevealed({ secret: result.secret, last4: result.last4 })
      setName('')
    })
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">
        Generate a new key
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Keys are shown exactly once. Copy yours immediately — we only store
        a hash, so we can&rsquo;t retrieve it later.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700">
            Label (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zapier integration"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700">
            Scope
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'read' | 'write')}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="read">Read only</option>
            <option value="write">Read + write (v1.1)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Generating…' : 'Generate key'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {revealed && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Copy this now — you won&rsquo;t see it again
          </div>
          <div className="mt-2 break-all rounded border border-amber-300 bg-white p-3 font-mono text-sm text-zinc-900">
            {revealed.secret}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(revealed.secret)}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              I&rsquo;ve copied it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
