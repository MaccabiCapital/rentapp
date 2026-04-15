// ============================================================
// Dashboard → Tenants → [id] → Leases → [leaseId] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaseWithRelations } from '@/app/lib/queries/leases'
import { now } from '@/app/lib/now'
import { LeaseStatusBadge } from '@/app/ui/lease-status-badge'
import { TerminateLeaseButton } from '@/app/ui/terminate-lease-button'
import { DeleteLeaseButton } from '@/app/ui/delete-lease-button'
import { TenantNoticeButton } from '@/app/ui/tenant-notice-button'
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

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; leaseId: string }>
}) {
  const { id, leaseId } = await params
  const lease = await getLeaseWithRelations(leaseId)
  if (!lease || lease.tenant.id !== id) notFound()

  const nowMs = now()
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
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <Link
              href={`/dashboard/tenants/${id}/leases/${leaseId}/pdf`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </Link>
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
          {lease.status === 'active' && (
            <TenantNoticeButton
              leaseId={leaseId}
              currentNoticeDate={lease.tenant_notice_given_on}
            />
          )}
          {lease.status === 'active' && (() => {
            const msToEnd =
              new Date(lease.end_date).getTime() - nowMs
            const daysToEnd = Math.floor(msToEnd / (1000 * 60 * 60 * 24))
            if (daysToEnd >= 0 && daysToEnd <= 90) {
              return <StartRenewalButton leaseId={leaseId} />
            }
            return null
          })()}
        </div>
      </div>

      {lease.status === 'active' && (() => {
        const msToEnd =
          new Date(lease.end_date).getTime() - nowMs
        const daysToEnd = Math.floor(msToEnd / (1000 * 60 * 60 * 24))
        if (lease.tenant_notice_given_on) {
          return (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="font-semibold">Tenant has given notice.</span>{' '}
              They will vacate on or before the lease end date (
              {new Date(lease.end_date).toLocaleDateString()}). Prep the unit
              for turnover and start marketing the vacancy.
            </div>
          )
        }
        if (daysToEnd < 0) {
          return (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="font-semibold">
                This lease expired {Math.abs(daysToEnd)} day
                {Math.abs(daysToEnd) === 1 ? '' : 's'} ago.
              </span>{' '}
              Either terminate it, convert it to month-to-month, or start a
              renewal offer now.
            </div>
          )
        }
        if (daysToEnd <= 90) {
          return (
            <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">
                This lease expires in {daysToEnd} day
                {daysToEnd === 1 ? '' : 's'}.
              </span>{' '}
              Start a renewal offer now or prepare for turnover.
            </div>
          )
        }
        return null
      })()}

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
