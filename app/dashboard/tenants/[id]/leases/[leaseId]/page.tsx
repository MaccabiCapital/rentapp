// ============================================================
// Dashboard → Tenants → [id] → Leases → [leaseId] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaseWithRelations } from '@/app/lib/queries/leases'
import { LeaseStatusBadge } from '@/app/ui/lease-status-badge'
import { TerminateLeaseButton } from '@/app/ui/terminate-lease-button'
import { DeleteLeaseButton } from '@/app/ui/delete-lease-button'

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

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; leaseId: string }>
}) {
  const { id, leaseId } = await params
  const lease = await getLeaseWithRelations(leaseId)
  if (!lease || lease.tenant.id !== id) notFound()

  const tenantName = `${lease.tenant.first_name} ${lease.tenant.last_name}`
  const unitLabel = lease.unit.unit_number ?? `Unit ${lease.unit.id.slice(0, 8)}`

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/tenants" className="hover:text-zinc-900">
          Tenants
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/dashboard/tenants/${id}`}
          className="hover:text-zinc-900"
        >
          {tenantName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">Lease</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Lease for {tenantName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {lease.unit.property.name} · {unitLabel}
          </p>
          <div className="mt-2">
            <LeaseStatusBadge status={lease.status} />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Link
            href={`/dashboard/tenants/${id}/leases/${leaseId}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit lease
          </Link>
          {(lease.status === 'active' || lease.status === 'draft') && (
            <TerminateLeaseButton leaseId={leaseId} />
          )}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Start date" value={formatDate(lease.start_date)} />
        <DetailRow label="End date" value={formatDate(lease.end_date)} />
        <DetailRow label="Monthly rent" value={formatCurrency(lease.monthly_rent)} />
        <DetailRow
          label="Security deposit"
          value={formatCurrency(lease.security_deposit)}
        />
        <DetailRow label="Rent due day" value={lease.rent_due_day.toString()} />
        <DetailRow
          label="Late fee"
          value={
            lease.late_fee_amount
              ? `${formatCurrency(lease.late_fee_amount)} after ${lease.late_fee_grace_days ?? 0} days`
              : null
          }
        />
        <DetailRow label="Signed" value={formatDate(lease.signed_at)} />
        <DetailRow label="Notes" value={lease.notes} />
      </dl>

      {lease.status === 'draft' && (
        <div className="mt-6 flex justify-end">
          <DeleteLeaseButton leaseId={leaseId} />
        </div>
      )}
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
