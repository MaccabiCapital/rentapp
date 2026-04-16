// ============================================================
// Dashboard → Tenants → [id] → Tenant detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenant } from '@/app/lib/queries/tenants'
import { getLeasesForTenant } from '@/app/lib/queries/leases'
import { LeaseStatusBadge } from '@/app/ui/lease-status-badge'
import { DeleteTenantButton } from '@/app/ui/delete-tenant-button'
import { CommunicationsTimeline } from '@/app/ui/communications-timeline'

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

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenant = await getTenant(id)
  if (!tenant) notFound()

  const leases = await getLeasesForTenant(id)

  const fullName = `${tenant.first_name} ${tenant.last_name}`

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/tenants" className="hover:text-zinc-900">
          Tenants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{fullName}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{fullName}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {tenant.email ?? 'No email'} · {tenant.phone ?? 'No phone'}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Link
            href={`/dashboard/tenants/${tenant.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit tenant
          </Link>
          <DeleteTenantButton tenantId={tenant.id} tenantName={fullName} />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Date of birth" value={formatDate(tenant.date_of_birth)} />
        <DetailRow
          label="Emergency contact"
          value={
            tenant.emergency_contact_name || tenant.emergency_contact_phone
              ? `${tenant.emergency_contact_name ?? '—'} · ${tenant.emergency_contact_phone ?? '—'}`
              : null
          }
        />
        <DetailRow label="Added" value={formatDate(tenant.created_at)} />
        <DetailRow label="Notes" value={tenant.notes} />
      </dl>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Leases ({leases.length})
        </h2>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <h3 className="text-base font-semibold text-zinc-900">No leases yet</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Start a lease from a unit page: Properties → pick a unit → Add lease.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Unit</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Rent / mo</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {leases.map((l) => (
                <tr key={l.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/tenants/${tenant.id}/leases/${l.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {l.unit.property.name} ·{' '}
                      {l.unit.unit_number ?? 'unit'}
                    </Link>
                  </Td>
                  <Td>{formatDate(l.start_date)}</Td>
                  <Td>{formatDate(l.end_date)}</Td>
                  <Td>{formatCurrency(l.monthly_rent)}</Td>
                  <Td>
                    <LeaseStatusBadge status={l.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CommunicationsTimeline
        entityType="tenant"
        entityId={tenant.id}
        description="Calls, texts, and notes about this tenant."
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? '—'}</dd>
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
