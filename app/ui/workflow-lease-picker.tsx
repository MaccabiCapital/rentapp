// ============================================================
// Lease picker for workflows that need a lease anchor
// ============================================================
//
// Server component — renders a list of leases with one-click
// "Start with this lease" links that carry the workflow slug.

import Link from 'next/link'

type Lease = {
  id: string
  tenant_name: string
  unit_label: string
  property_name: string
  status: string
  end_date: string
}

export function WorkflowLeasePicker({
  workflowSlug,
  leases,
  emptyMessage,
}: {
  workflowSlug: string
  leases: Lease[]
  emptyMessage: string
}) {
  if (leases.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-600">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <ul className="divide-y divide-zinc-100">
        {leases.map((l) => (
          <li key={l.id}>
            <Link
              href={`/dashboard/workflows/${workflowSlug}?leaseId=${l.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {l.tenant_name}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {l.property_name} · {l.unit_label} · lease ends{' '}
                  {new Date(l.end_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <span className="text-xs text-indigo-600">Start →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

type Unit = {
  id: string
  label: string
  property_name: string
  status: string
}

export function WorkflowUnitPicker({
  workflowSlug,
  units,
  emptyMessage,
}: {
  workflowSlug: string
  units: Unit[]
  emptyMessage: string
}) {
  if (units.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-600">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <ul className="divide-y divide-zinc-100">
        {units.map((u) => (
          <li key={u.id}>
            <Link
              href={`/dashboard/workflows/${workflowSlug}?unitId=${u.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {u.property_name} · {u.label}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Status: {u.status}
                </div>
              </div>
              <span className="text-xs text-indigo-600">Start →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
