import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProspect } from '@/app/lib/queries/prospects'
import { getAllUnitsWithProperty } from '@/app/lib/queries/units'
import { updateProspect } from '@/app/actions/prospects'
import { ProspectForm } from '@/app/ui/prospect-form'

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [prospect, units] = await Promise.all([
    getProspect(id),
    getAllUnitsWithProperty(),
  ])
  if (!prospect) notFound()

  const unitOptions = units.map((u) => ({
    id: u.id,
    label: `${u.property.name}${u.unit_number ? ` · ${u.unit_number}` : ''}`,
  }))

  const updateWithId = updateProspect.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/prospects/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to prospect
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit prospect
        </h1>
      </div>
      <ProspectForm
        action={updateWithId}
        defaultValues={prospect}
        mode="edit"
        unitOptions={unitOptions}
      />
    </div>
  )
}
