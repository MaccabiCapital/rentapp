import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnit } from '@/app/lib/queries/units'
import { updateUnit } from '@/app/actions/units'
import { UnitForm } from '@/app/ui/unit-form'

export default async function EditUnitPage({
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

  const updateWithIds = updateUnit.bind(null, unitId, id)

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm text-zinc-600">
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
          <Link
            href={`/dashboard/properties/${id}/units/${unitId}`}
            className="hover:text-zinc-900"
          >
            Unit {unit.unit_number ?? unitId.slice(0, 8)}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">Edit</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit unit
        </h1>
      </div>
      <UnitForm action={updateWithIds} defaultValues={unit} />
    </div>
  )
}
