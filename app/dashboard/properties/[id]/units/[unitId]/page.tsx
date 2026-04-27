// ============================================================
// Dashboard → Properties → [id] → Units → [unitId] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnit } from '@/app/lib/queries/units'
import { getActiveLeaseForUnit } from '@/app/lib/queries/leases'
import { getMaintenanceForUnit } from '@/app/lib/queries/maintenance'
import { UnitStatusBadge } from '@/app/ui/unit-status-badge'
import { LeaseStatusBadge } from '@/app/ui/lease-status-badge'
import { MaintenanceStatusBadge } from '@/app/ui/maintenance-status-badge'
import { UrgencyBadge } from '@/app/ui/urgency-badge'
import { DeleteUnitButton } from '@/app/ui/delete-unit-button'
import { PhotoGallery } from '@/app/ui/photo-gallery'
import { PhotoUploader } from '@/app/ui/photo-uploader'

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

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id, unitId } = await params
  const [property, unit, activeLease, maintenance] = await Promise.all([
    getProperty(id),
    getUnit(unitId, id),
    getActiveLeaseForUnit(unitId),
    getMaintenanceForUnit(unitId),
  ])
  if (!property || !unit) notFound()

  const unitLabel = unit.unit_number ?? `Unit ${unitId.slice(0, 8)}`

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/properties" className="hover:text-zinc-900">
          Properties
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/dashboard/properties/${id}`}
          className="hover:text-zinc-900"
        >
          {property.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{unitLabel}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{unitLabel}</h1>
          <div className="mt-2">
            <UnitStatusBadge status={unit.status} />
          </div>
        </div>
        <div className="flex items-start gap-2">
          {(unit.status === 'vacant' || unit.status === 'notice_given') && (
            <>
              <Link
                href={`/dashboard/listings/new?property=${property.id}&unit=${unit.id}`}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                Create listing
              </Link>
              <Link
                href={`/dashboard/prospects/new?unit=${unit.id}`}
                className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Track prospect
              </Link>
            </>
          )}
          <Link
            href={`/dashboard/properties/${property.id}/units/${unit.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit unit
          </Link>
          <DeleteUnitButton
            unitId={unit.id}
            propertyId={property.id}
            unitLabel={unitLabel}
          />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow
          label="Monthly rent"
          value={formatCurrency(unit.monthly_rent)}
        />
        <DetailRow
          label="Security deposit"
          value={formatCurrency(unit.security_deposit)}
        />
        <DetailRow
          label="Bedrooms"
          value={unit.bedrooms?.toString() ?? null}
        />
        <DetailRow
          label="Bathrooms"
          value={unit.bathrooms?.toString() ?? null}
        />
        <DetailRow
          label="Square feet"
          value={unit.square_feet?.toString() ?? null}
        />
      </dl>

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Photos ({unit.photos.length})
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Marketing photos for vacancy listings and tenant reference.
        </p>
      </div>
      <div className="mb-6">
        <PhotoGallery
          entityType="units"
          entityId={unit.id}
          photos={unit.photos}
          emptyMessage="No photos yet. Upload some so prospects can see the space."
        />
      </div>
      <div className="mb-10">
        <PhotoUploader entityType="units" entityId={unit.id} />
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Lease</h2>
        {!activeLease && (
          <Link
            href={`/dashboard/properties/${property.id}/units/${unit.id}/lease/new`}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add lease
          </Link>
        )}
      </div>

      {activeLease ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">Tenant</p>
              <Link
                href={`/dashboard/tenants/${activeLease.tenant.id}`}
                className="text-base font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {activeLease.tenant.first_name} {activeLease.tenant.last_name}
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                {activeLease.tenant.email ?? 'No email on file'}
              </p>
            </div>
            <LeaseStatusBadge status={activeLease.status} />
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DetailRow label="Start" value={formatDate(activeLease.start_date)} />
            <DetailRow label="End" value={formatDate(activeLease.end_date)} />
            <DetailRow
              label="Rent"
              value={formatCurrency(activeLease.monthly_rent)}
            />
          </dl>
          <div className="mt-6">
            <Link
              href={`/dashboard/tenants/${activeLease.tenant.id}/leases/${activeLease.id}`}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View lease details →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <h3 className="text-base font-semibold text-zinc-900">
            No active lease
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Start a lease to link a tenant and begin tracking rent.
          </p>
        </div>
      )}

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Maintenance ({maintenance.length})
        </h2>
        <Link
          href={`/dashboard/properties/${property.id}/units/${unit.id}/maintenance/new`}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Report issue
        </Link>
      </div>

      {maintenance.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <h3 className="text-base font-semibold text-zinc-900">
            No maintenance requests
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Log a leak, broken appliance, or any other issue so it stays
            tracked with cost history.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Title
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Urgency
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Reported
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {maintenance.map((m) => (
                <tr key={m.id} className="even:bg-zinc-50/40">
                  <td className="px-4 py-3 text-sm text-zinc-900">
                    <Link
                      href={`/dashboard/properties/maintenance/${m.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <UrgencyBadge urgency={m.urgency} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <MaintenanceStatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900">
                    {formatDate(m.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
