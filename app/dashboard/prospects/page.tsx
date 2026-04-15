// ============================================================
// Dashboard → Prospects → pipeline page
// ============================================================
//
// Kanban is the default view (the wedge). Table is opt-in via
// ?view=table for landlords who want a spreadsheet mindset.

import Link from 'next/link'
import { now } from '@/app/lib/now'
import { getProspects } from '@/app/lib/queries/prospects'
import {
  ProspectPipeline,
  ProspectTerminalBins,
} from '@/app/ui/prospect-pipeline'
import { ProspectEmptyState } from '@/app/ui/prospect-empty-state'
import { ProspectStageBadge } from '@/app/ui/prospect-stage-badge'

function displayName(p: {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}): string {
  const first = p.first_name?.trim()
  const last = p.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return p.email ?? p.phone ?? 'Unnamed prospect'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const isTableView = view === 'table'

  const prospects = await getProspects()
  const nowMs = now()

  const overdueCount = prospects.filter(
    (p) =>
      p.follow_up_at !== null &&
      new Date(p.follow_up_at).getTime() < nowMs &&
      p.stage !== 'declined' &&
      p.stage !== 'withdrew' &&
      p.stage !== 'lease_signed',
  ).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Prospects</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track everyone who inquired about a vacant unit, from first contact
            to signed lease.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 bg-white p-0.5 text-xs">
            <Link
              href="/dashboard/prospects"
              className={
                !isTableView
                  ? 'rounded bg-indigo-600 px-3 py-1 font-medium text-white'
                  : 'rounded px-3 py-1 text-zinc-600 hover:text-zinc-900'
              }
            >
              Pipeline
            </Link>
            <Link
              href="/dashboard/prospects?view=table"
              className={
                isTableView
                  ? 'rounded bg-indigo-600 px-3 py-1 font-medium text-white'
                  : 'rounded px-3 py-1 text-zinc-600 hover:text-zinc-900'
              }
            >
              Table
            </Link>
          </div>
          <Link
            href="/dashboard/prospects/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add prospect
          </Link>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">{overdueCount}</span> prospect
          {overdueCount === 1 ? '' : 's'} overdue for follow-up.
        </div>
      )}

      {prospects.length === 0 ? (
        <ProspectEmptyState />
      ) : isTableView ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Unit</Th>
                <Th>Source</Th>
                <Th>Stage</Th>
                <Th>Follow up</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {prospects.map((p) => (
                <tr key={p.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/prospects/${p.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {displayName(p)}
                    </Link>
                  </Td>
                  <Td>
                    <div className="text-xs text-zinc-600">
                      {p.email ?? '—'}
                    </div>
                    <div className="text-xs text-zinc-500">{p.phone ?? '—'}</div>
                  </Td>
                  <Td>
                    {p.unit ? (
                      <Link
                        href={`/dashboard/properties/${p.unit.property_id}/units/${p.unit_id}`}
                        className="text-zinc-700 hover:text-zinc-900"
                      >
                        {p.unit.property.name}
                        {p.unit.unit_number ? ` · ${p.unit.unit_number}` : ''}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>{p.source ?? '—'}</Td>
                  <Td>
                    <ProspectStageBadge stage={p.stage} />
                  </Td>
                  <Td>{formatDate(p.follow_up_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <ProspectPipeline prospects={prospects} nowMs={nowMs} />
          <ProspectTerminalBins prospects={prospects} nowMs={nowMs} />
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-zinc-900">{children}</td>
}
