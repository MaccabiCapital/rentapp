// ============================================================
// Dashboard → Properties → Rent roll page
// ============================================================
//
// Landlord's primary at-a-glance view. One row per unit across
// every property they own.

import Link from 'next/link'
import { getAllUnitsWithProperty } from '@/app/lib/queries/units'
import { RentRollEmptyState } from '@/app/ui/rent-roll-empty-state'
import { RentRollStats } from '@/app/ui/rent-roll-stats'
import { UnitStatusBadge } from '@/app/ui/unit-status-badge'

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

export default async function PropertiesPage() {
  const units = await getAllUnitsWithProperty()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Properties</h1>
        <Link
          href="/dashboard/properties/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add property
        </Link>
      </div>

      {units.length === 0 ? (
        <RentRollEmptyState />
      ) : (
        <>
          <RentRollStats units={units} />
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Property</Th>
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
                        href={`/dashboard/properties/${unit.property.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {unit.property.name}
                      </Link>
                    </Td>
                    <Td>{unit.unit_number ?? '—'}</Td>
                    <Td>{formatBedBath(unit.bedrooms, unit.bathrooms)}</Td>
                    <Td>{unit.square_feet ?? '—'}</Td>
                    <Td>{formatCurrency(unit.monthly_rent)}</Td>
                    <Td>
                      <UnitStatusBadge status={unit.status} />
                    </Td>
                    <Td>
                      <div className="flex gap-3 text-sm">
                        <Link
                          href={`/dashboard/properties/${unit.property.id}/units/${unit.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/properties/${unit.property.id}`}
                          className="text-zinc-600 hover:text-zinc-900"
                        >
                          View property
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
