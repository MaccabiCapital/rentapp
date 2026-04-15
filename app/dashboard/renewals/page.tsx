// ============================================================
// Dashboard → Renewals
// ============================================================
//
// Three-bucket view of leases that need attention:
//   - Red: tenant gave notice (leaving)
//   - Amber: past due or expiring within 30 days
//   - Blue: expiring in 31-90 days
//
// "Renewal" isn't a new table — it's a new lease with status=draft
// started via the startRenewal server action.

import Link from 'next/link'
import {
  getExpiringLeases,
  countDraftLeasesForUnits,
  type LeaseWithContext,
} from '@/app/lib/queries/renewals'
import { LeaseStatusBadge } from '@/app/ui/lease-status-badge'
import { StartRenewalButton } from '@/app/ui/start-renewal-button'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime()
  const now = Date.now()
  return Math.floor((target - now) / (1000 * 60 * 60 * 24))
}

function tenantName(lease: LeaseWithContext): string {
  const t = lease.tenant
  if (!t) return 'Unknown tenant'
  return `${t.first_name} ${t.last_name}`.trim()
}

function unitLabel(lease: LeaseWithContext): string {
  const u = lease.unit
  if (!u) return 'Unknown unit'
  return u.unit_number
    ? `${u.property.name} · ${u.unit_number}`
    : u.property.name
}

export default async function RenewalsPage() {
  const leases = await getExpiringLeases()

  // Bucket by state
  const tenantNotice: LeaseWithContext[] = []
  const urgent: LeaseWithContext[] = []
  const upcoming: LeaseWithContext[] = []

  for (const l of leases) {
    if (l.tenant_notice_given_on) {
      tenantNotice.push(l)
      continue
    }
    const days = daysUntil(l.end_date)
    if (days <= 30) urgent.push(l)
    else upcoming.push(l)
  }

  tenantNotice.sort((a, b) => (a.end_date < b.end_date ? -1 : 1))
  urgent.sort((a, b) => (a.end_date < b.end_date ? -1 : 1))
  upcoming.sort((a, b) => (a.end_date < b.end_date ? -1 : 1))

  const unitIds = leases
    .map((l) => l.unit?.id)
    .filter((id): id is string => typeof id === 'string')
  const draftCounts = await countDraftLeasesForUnits(unitIds)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Renewals</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Leases that need attention in the next 90 days, plus anyone who has
          given notice.
        </p>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            Nothing to worry about
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            No active leases are expiring in the next 90 days and no tenants
            have given notice.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {tenantNotice.length > 0 && (
            <Section
              title="Tenant gave notice"
              description="These tenants are leaving. Prep the unit and start marketing the vacancy."
              tone="red"
              leases={tenantNotice}
              draftCounts={draftCounts}
              showNoticeDate
            />
          )}
          {urgent.length > 0 && (
            <Section
              title="Past due or expiring this month"
              description="These leases need a decision right now — renewal, termination, or month-to-month."
              tone="amber"
              leases={urgent}
              draftCounts={draftCounts}
            />
          )}
          {upcoming.length > 0 && (
            <Section
              title="Expiring in 31–90 days"
              description="Start renewal outreach soon so you have time for negotiation."
              tone="blue"
              leases={upcoming}
              draftCounts={draftCounts}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  description,
  tone,
  leases,
  draftCounts,
  showNoticeDate = false,
}: {
  title: string
  description: string
  tone: 'red' | 'amber' | 'blue'
  leases: LeaseWithContext[]
  draftCounts: Record<string, number>
  showNoticeDate?: boolean
}) {
  const toneClasses = {
    red: 'border-red-300 bg-red-50',
    amber: 'border-amber-300 bg-amber-50',
    blue: 'border-blue-300 bg-blue-50',
  }[tone]
  const toneTitleClass = {
    red: 'text-red-800',
    amber: 'text-amber-800',
    blue: 'text-blue-800',
  }[tone]

  return (
    <section>
      <div className={`mb-3 rounded-md border px-4 py-3 ${toneClasses}`}>
        <h2
          className={`text-sm font-semibold uppercase tracking-wide ${toneTitleClass}`}
        >
          {title} ({leases.length})
        </h2>
        <p className={`mt-1 text-xs ${toneTitleClass}`}>{description}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Tenant</Th>
              <Th>Where</Th>
              <Th>Rent</Th>
              <Th>End date</Th>
              <Th>Days</Th>
              {showNoticeDate && <Th>Notice given</Th>}
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {leases.map((l) => {
              const days = daysUntil(l.end_date)
              const daysDisplay =
                days < 0
                  ? `${Math.abs(days)} past`
                  : days === 0
                    ? 'today'
                    : `${days}d`
              const existingDrafts = l.unit ? draftCounts[l.unit.id] ?? 0 : 0
              return (
                <tr key={l.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/tenants/${l.tenant?.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {tenantName(l)}
                    </Link>
                  </Td>
                  <Td>
                    {l.unit && (
                      <Link
                        href={`/dashboard/properties/${l.unit.property_id}/units/${l.unit.id}`}
                        className="text-zinc-700 hover:text-zinc-900"
                      >
                        {unitLabel(l)}
                      </Link>
                    )}
                  </Td>
                  <Td>{formatCurrency(Number(l.monthly_rent))}</Td>
                  <Td>{formatDate(l.end_date)}</Td>
                  <Td
                    className={
                      days < 0
                        ? 'font-semibold text-red-700'
                        : days <= 30
                          ? 'font-semibold text-amber-700'
                          : ''
                    }
                  >
                    {daysDisplay}
                  </Td>
                  {showNoticeDate && (
                    <Td>{formatDate(l.tenant_notice_given_on)}</Td>
                  )}
                  <Td>
                    <LeaseStatusBadge status={l.status} />
                  </Td>
                  <Td>
                    <div className="flex flex-col items-end gap-1">
                      {existingDrafts > 0 ? (
                        <Link
                          href={`/dashboard/tenants/${l.tenant?.id}`}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Draft started ✓
                        </Link>
                      ) : (
                        !l.tenant_notice_given_on && (
                          <StartRenewalButton leaseId={l.id} />
                        )
                      )}
                      <Link
                        href={`/dashboard/tenants/${l.tenant?.id}/leases/${l.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-700"
                      >
                        View lease
                      </Link>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
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

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-sm text-zinc-900 ${className ?? ''}`}>
      {children}
    </td>
  )
}
