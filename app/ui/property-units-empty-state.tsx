// ============================================================
// PropertyUnitsEmptyState — shown when a property has no units
// ============================================================

import Link from 'next/link'

export function PropertyUnitsEmptyState({ propertyId }: { propertyId: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
      <h3 className="text-base font-semibold text-zinc-900">No units yet</h3>
      <p className="mt-1 text-sm text-zinc-600">
        Add units to this property to start tracking rent and occupancy.
      </p>
      <div className="mt-4">
        <Link
          href={`/dashboard/properties/${propertyId}/units/new`}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add unit
        </Link>
      </div>
    </div>
  )
}
