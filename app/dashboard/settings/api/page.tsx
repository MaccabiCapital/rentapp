// ============================================================
// Dashboard → Settings → API
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import { ApiKeyManager } from '@/app/ui/api-key-manager'

type ApiKeyRow = {
  id: string
  prefix: string
  last_4: string
  name: string | null
  scopes: string[]
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function ApiSettingsPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false })
  const keys = (data ?? []) as ApiKeyRow[]
  const active = keys.filter((k) => !k.revoked_at)
  const revoked = keys.filter((k) => k.revoked_at)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">API access</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generate keys to read your Rentbase data programmatically. Use them
          in scripts, Zapier, n8n, or your own dashboards.
        </p>
      </div>

      <ApiKeyManager />

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Active keys ({active.length})
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Scopes</Th>
                  <Th>Created</Th>
                  <Th>Last used</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {active.map((k) => (
                  <tr key={k.id}>
                    <Td>
                      <span className="font-medium text-zinc-900">
                        {k.name ?? <span className="text-zinc-500">unnamed</span>}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-zinc-700">
                        {k.prefix}••••••••{k.last_4}
                      </span>
                    </Td>
                    <Td>
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="mr-1 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                        >
                          {s}
                        </span>
                      ))}
                    </Td>
                    <Td className="text-zinc-600">{formatDateTime(k.created_at)}</Td>
                    <Td className="text-zinc-600">{formatDateTime(k.last_used_at)}</Td>
                    <Td className="text-right">
                      <RevokeButton keyId={k.id} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {revoked.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Revoked ({revoked.length})
          </h2>
          <div className="mt-3 space-y-2">
            {revoked.map((k) => (
              <div
                key={k.id}
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600"
              >
                <span className="font-medium text-zinc-700">
                  {k.name ?? 'unnamed'}
                </span>{' '}
                <span className="font-mono">
                  {k.prefix}••••{k.last_4}
                </span>{' '}
                · revoked {formatDateTime(k.revoked_at)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* API quick-start docs */}
      <section className="mt-12 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">Quickstart</h2>
        <p className="mt-1 text-sm text-zinc-600">
          The API is read-only in v1. Pass your key as a Bearer token. All
          responses are JSON.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">
          {`curl https://app.rentbase.app/api/v1/properties \\
  -H "Authorization: Bearer rb_live_••••••••••••••••••••"`}
        </pre>
        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Endpoints</h3>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          <li><code className="text-xs">GET /api/v1/properties</code> — list properties</li>
          <li><code className="text-xs">GET /api/v1/properties/:id</code> — property + units</li>
          <li><code className="text-xs">GET /api/v1/tenants</code> — list tenants</li>
          <li><code className="text-xs">GET /api/v1/leases</code> — list leases</li>
          <li><code className="text-xs">GET /api/v1/listings</code> — list listings</li>
          <li><code className="text-xs">GET /api/v1/prospects</code> — list prospects</li>
        </ul>
        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Pagination</h3>
        <p className="mt-1 text-sm text-zinc-700">
          Cursor-based. Pass <code className="text-xs">?limit=50</code> (max 100)
          and use the <code className="text-xs">pagination.next_cursor</code> from
          the response as the next request&rsquo;s{' '}
          <code className="text-xs">?cursor=…</code>.
        </p>
        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Rate limit</h3>
        <p className="mt-1 text-sm text-zinc-700">
          60 requests per minute per key. Exceeding returns HTTP 429.
        </p>
      </section>
    </div>
  )
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
  )
}

import { RevokeApiKeyButton } from '@/app/ui/revoke-api-key-button'

function RevokeButton({ keyId }: { keyId: string }) {
  return <RevokeApiKeyButton keyId={keyId} />
}
