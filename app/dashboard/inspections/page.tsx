// ============================================================
// Dashboard → Inspections → list page
// ============================================================
//
// Shows every move-in / move-out / periodic inspection the
// landlord has created, most recent first. Each row links to
// the detail page where items get rated and signed off.

import Link from 'next/link'
import { getInspections } from '@/app/lib/queries/inspections'
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
} from '@/app/lib/schemas/inspection'
import type {
  InspectionStatus,
  InspectionType,
} from '@/app/lib/schemas/inspection'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TYPE_BADGE: Record<InspectionType, string> = {
  move_in: 'bg-emerald-100 text-emerald-800',
  move_out: 'bg-amber-100 text-amber-800',
  periodic: 'bg-zinc-100 text-zinc-700',
}

const STATUS_BADGE: Record<InspectionStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-indigo-100 text-indigo-800',
  signed: 'bg-emerald-100 text-emerald-800',
}

export default async function InspectionsPage() {
  const inspections = await getInspections()

  if (inspections.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Inspections
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Document every room with photos at move-in and move-out. Protects
              you in security-deposit disputes.
            </p>
          </div>
          <Link
            href="/dashboard/inspections/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Start an inspection
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No inspections yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Start a move-in inspection the day a tenant gets the keys. Walk
            through each room, rate the condition, snap photos. When they move
            out, do a matching move-out inspection — the side-by-side is your
            defense.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/inspections/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Start your first inspection
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Inspections</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {inspections.length}{' '}
            {inspections.length === 1 ? 'inspection' : 'inspections'} on file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/inspections/calendar"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Calendar
          </Link>
          <Link
            href="/dashboard/inspections/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Start an inspection
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Type</Th>
              <Th>Property / unit / tenant</Th>
              <Th>Scheduled</Th>
              <Th>Progress</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {inspections.map((ins) => {
              const tenantName = ins.lease?.tenant
                ? `${ins.lease.tenant.first_name} ${ins.lease.tenant.last_name}`.trim()
                : 'Unknown tenant'
              const unitLabel = ins.lease?.unit?.unit_number ?? 'Unit'
              const propertyName =
                ins.lease?.unit?.property?.name ?? 'Unknown property'
              const progress =
                ins.item_count === 0
                  ? '—'
                  : `${ins.rated_count} / ${ins.item_count} rated`
              return (
                <tr key={ins.id} className="even:bg-zinc-50/40">
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[ins.type]}`}
                    >
                      {INSPECTION_TYPE_LABELS[ins.type]}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/inspections/${ins.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {propertyName} · {unitLabel}
                    </Link>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {tenantName}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-sm">{formatDate(ins.scheduled_for)}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      Created {formatDate(ins.created_at)}
                    </div>
                  </Td>
                  <Td>{progress}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ins.status]}`}
                    >
                      {INSPECTION_STATUS_LABELS[ins.status]}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}
