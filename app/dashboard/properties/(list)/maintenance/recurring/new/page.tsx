import Link from 'next/link'
import { getProperties } from '@/app/lib/queries/properties'
import { getAllUnitsWithProperty } from '@/app/lib/queries/units'
import { RecurringTaskForm } from '@/app/ui/recurring-task-form'

export default async function NewRecurringTaskPage() {
  const [properties, units] = await Promise.all([
    getProperties(),
    getAllUnitsWithProperty(),
  ])

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/properties/maintenance/recurring"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Recurring maintenance
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Add a recurring task
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Set the frequency once. The next-due date advances each time you
          mark it complete.
        </p>
      </div>
      <RecurringTaskForm
        propertyOptions={properties.map((p) => ({ id: p.id, name: p.name }))}
        unitOptions={units.map((u) => ({
          id: u.id,
          unit_number: u.unit_number,
          property_name: u.property?.name ?? 'Property',
        }))}
      />
    </div>
  )
}
