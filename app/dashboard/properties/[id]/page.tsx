// ============================================================
// Dashboard → Properties → [id] → Property detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnitsForProperty } from '@/app/lib/queries/units'
import { PropertyUnitsEmptyState } from '@/app/ui/property-units-empty-state'
import { UnitStatusBadge } from '@/app/ui/unit-status-badge'
import { DeletePropertyButton } from '@/app/ui/delete-property-button'
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

function formatBedBath(bedrooms: number | null, bathrooms: number | null) {
  if (bedrooms === null && bathrooms === null) return '—'
  return `${bedrooms ?? 0} / ${bathrooms ?? 0}`
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()

  const units = await getUnitsForProperty(id)

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/properties" className="hover:text-zinc-900">
          Properties
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{property.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{property.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {property.street_address}, {property.city}, {property.state}{' '}
            {property.postal_code}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Link
            href={`/dashboard/properties/${property.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit property
          </Link>
          <DeletePropertyButton
            propertyId={property.id}
            propertyName={property.name}
          />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Property type" value={property.property_type} />
        <DetailRow
          label="Year built"
          value={property.year_built?.toString() ?? null}
        />
        <DetailRow label="Country" value={property.country} />
        <DetailRow label="Notes" value={property.notes} />
      </dl>

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Photos ({property.photos?.length ?? 0})
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Exterior and neighborhood shots for listings and record keeping.
        </p>
      </div>
      <div className="mb-6">
        <PhotoGallery
          entityType="properties"
          entityId={property.id}
          photos={property.photos ?? []}
          emptyMessage="No photos yet. Add an exterior shot so this property has a face."
        />
      </div>
      <div className="mb-10">
        <PhotoUploader entityType="properties" entityId={property.id} />
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Units ({units.length})
        </h2>
        <Link
          href={`/dashboard/properties/${property.id}/units/new`}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add unit
        </Link>
      </div>

      {units.length === 0 ? (
        <PropertyUnitsEmptyState propertyId={property.id} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Unit #</Th>
                <Th>Bed / Bath</Th>
                <Th>Sq Ft</Th>
                <Th>Rent / mo</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {units.map((unit) => (
                <tr key={unit.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/properties/${property.id}/units/${unit.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {unit.unit_number ?? '—'}
                    </Link>
                  </Td>
                  <Td>{formatBedBath(unit.bedrooms, unit.bathrooms)}</Td>
                  <Td>{unit.square_feet ?? '—'}</Td>
                  <Td>{formatCurrency(unit.monthly_rent)}</Td>
                  <Td>
                    <UnitStatusBadge status={unit.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/properties/${property.id}/units/${unit.id}/edit`}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </Link>
                    </div>
                  </Td>
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
