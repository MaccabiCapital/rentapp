import Link from 'next/link'
import { createInspection } from '@/app/actions/inspections'
import { getLeasesForPicker } from '@/app/lib/queries/inspections'
import { InspectionNewForm } from '@/app/ui/inspection-new-form'

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ leaseId?: string; type?: string }>
}) {
  const leases = await getLeasesForPicker()
  const params = await searchParams
  const initialLeaseId = params.leaseId
  const initialType = params.type

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/properties/inspections"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Inspections
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Start an inspection
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pick a lease and inspection type. We&rsquo;ll pre-populate a starter
          checklist of common rooms and items — you can add, rename, or delete
          items on the next page as you walk through.
        </p>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No leases yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            You need a lease in the system before you can create an inspection
            against it. Add a property, unit, and tenant first, then create a
            lease.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add a property
            </Link>
          </div>
        </div>
      ) : (
        <InspectionNewForm
          action={createInspection}
          leaseOptions={leases}
          initialLeaseId={initialLeaseId}
          initialType={initialType}
        />
      )}
    </div>
  )
}
