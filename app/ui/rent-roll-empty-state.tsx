// ============================================================
// RentRollEmptyState — shown when there are no units anywhere
// ============================================================

import Link from 'next/link'

export function RentRollEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
      <svg
        className="mx-auto h-12 w-12 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m4-11v11m4-11v11m4-11v11m4-11v11"
        />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        No properties yet
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Add your first property to start tracking units, rent, and tenants.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add property
        </Link>
      </div>
    </div>
  )
}
