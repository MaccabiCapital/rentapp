import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProperty } from '@/app/lib/queries/properties'
import { updateProperty } from '@/app/actions/properties'
import { PropertyForm } from '@/app/ui/property-form'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()

  const updateWithId = updateProperty.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/properties/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to property
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit property
        </h1>
      </div>
      <PropertyForm action={updateWithId} defaultValues={property} />
    </div>
  )
}
