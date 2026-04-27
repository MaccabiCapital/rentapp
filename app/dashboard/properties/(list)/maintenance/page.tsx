// ============================================================
// Dashboard → Maintenance → list page
// ============================================================
//
// Shows every maintenance request across every property. The
// status filter is a query-string param so it's shareable and
// history-navigable: ?status=open, ?status=all, etc.

import Link from 'next/link'
import { getMaintenanceRequests } from '@/app/lib/queries/maintenance'
import type { MaintenanceStatus } from '@/app/lib/schemas/maintenance'
import { MaintenanceStatusBadge } from '@/app/ui/maintenance-status-badge'
import { UrgencyBadge } from '@/app/ui/urgency-badge'
import { MaintenanceEmptyState } from '@/app/ui/maintenance-empty-state'

type FilterValue = 'all' | 'active' | MaintenanceStatus

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_parts', label: 'Awaiting Parts' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

function daysAgo(isoDate: string): string {
  const created = new Date(isoDate).getTime()
  const diffMs = Date.now() - created
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeFilter: FilterValue =
    status === 'all' ||
    status === 'open' ||
    status === 'in_progress' ||
    status === 'awaiting_parts' ||
    status === 'resolved' ||
    status === 'closed'
      ? status
      : 'active'

  const all = await getMaintenanceRequests()

  const filtered = all.filter((r) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'active') {
      return (
        r.status === 'open' ||
        r.status === 'assigned' ||
        r.status === 'in_progress' ||
        r.status === 'awaiting_parts'
      )
    }
    return r.status === activeFilter
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Maintenance</h1>
        <Link
          href="/dashboard/properties/maintenance/recurring"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Recurring tasks →
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {FILTER_TABS.map((tab) => {
          const isActive = tab.value === activeFilter
          const count =
            tab.value === 'all'
              ? all.length
              : tab.value === 'active'
                ? all.filter(
                    (r) =>
                      r.status === 'open' ||
                      r.status === 'in_progress' ||
                      r.status === 'awaiting_parts',
                  ).length
                : all.filter((r) => r.status === tab.value).length
          return (
            <Link
              key={tab.value}
              href={tab.value === 'active' ? '/dashboard/properties/maintenance' : `/dashboard/properties/maintenance?status=${tab.value}`}
              className={
                isActive
                  ? 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100'
              }
            >
              {tab.label}
              <span className={isActive ? 'ml-2 text-indigo-200' : 'ml-2 text-zinc-400'}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <MaintenanceEmptyState filtered={activeFilter !== 'active' || all.length > 0} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Title</Th>
                <Th>Where</Th>
                <Th>Urgency</Th>
                <Th>Status</Th>
                <Th>Age</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {filtered.map((r) => {
                const total =
                  (r.cost_materials ?? 0) + (r.cost_labor ?? 0)
                const totalDisplay = total > 0 ? formatCurrency(total) : '—'
                return (
                  <tr key={r.id} className="even:bg-zinc-50/40">
                    <Td>
                      <Link
                        href={`/dashboard/properties/maintenance/${r.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {r.title}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/properties/${r.unit.property_id}/units/${r.unit_id}`}
                        className="text-zinc-700 hover:text-zinc-900"
                      >
                        {r.unit.property.name}
                        {r.unit.unit_number ? ` · ${r.unit.unit_number}` : ''}
                      </Link>
                    </Td>
                    <Td>
                      <UrgencyBadge urgency={r.urgency} />
                    </Td>
                    <Td>
                      <MaintenanceStatusBadge status={r.status} />
                    </Td>
                    <Td>{daysAgo(r.created_at)}</Td>
                    <Td>{totalDisplay}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-500">
        {FILTER_TABS.find((t) => t.value === activeFilter)?.label}:{' '}
        {filtered.length} of {all.length}
      </div>
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
