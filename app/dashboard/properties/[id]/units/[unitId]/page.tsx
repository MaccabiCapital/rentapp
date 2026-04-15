// ============================================================
// Dashboard → Properties → [id] → Units → [unitId] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnit } from '@/app/lib/queries/units'
import { UnitStatusBadge } from '@/app/ui/unit-status-badge'
import { DeleteUnitButton } from '@/app/ui/delete-unit-button'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id, unitId } = await params
  const [property, unit] = await Promise.all([
    getProperty(id),
    getUnit(unitId, id),
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
