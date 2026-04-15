import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProperty } from '@/app/lib/queries/properties'
import { createUnit } from '@/app/actions/units'
import { UnitForm } from '@/app/ui/unit-form'

export default async function NewUnitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()

  const createForProperty = createUnit.bind(null, id)

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
          <span className="text-zinc-900">New unit</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add unit
        </h1>
      </div>
      <UnitForm action={createForProperty} />
    </div>
  )
}
