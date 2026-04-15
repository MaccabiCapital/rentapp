import Link from 'next/link'
import { createProspect } from '@/app/actions/prospects'
import { getAllUnitsWithProperty } from '@/app/lib/queries/units'
import { ProspectForm } from '@/app/ui/prospect-form'

export default async function NewProspectPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>
}) {
  const { unit: preselectedUnit } = await searchParams
  const units = await getAllUnitsWithProperty()

  const unitOptions = units.map((u) => ({
    id: u.id,
    label: `${u.property.name}${u.unit_number ? ` · ${u.unit_number}` : ''}`,
  }))

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/prospects"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to prospects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add prospect
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Track someone who inquired about a vacant unit. Link them to a unit
          now or leave blank and pick later.
        </p>
      </div>
      <ProspectForm
        action={createProspect}
        mode="create"
        unitOptions={unitOptions}
        defaultUnitId={preselectedUnit ?? null}
      />
    </div>
  )
}
