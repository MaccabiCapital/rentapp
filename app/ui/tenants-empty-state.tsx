import Link from 'next/link'

export function TenantsEmptyState() {
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
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m4 5.87v-2a4 4 0 00-4-4H7m10 6v-2a4 4 0 00-4-4h-1m-4-7a4 4 0 108 0 4 4 0 00-8 0z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        No tenants yet
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Add a tenant to start tracking leases, rent, and communication.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/tenants/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add tenant
        </Link>
      </div>
    </div>
  )
}
