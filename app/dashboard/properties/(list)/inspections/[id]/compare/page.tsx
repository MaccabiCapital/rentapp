// ============================================================
// Dashboard → Inspections → [id] → Compare
// ============================================================
//
// Pairs a move_in against a move_out on the same lease and
// shows a row-by-row diff highlighting damage. Prints cleanly
// so a landlord can staple it to a security-deposit letter.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInspectionPair } from '@/app/lib/queries/inspection-compare'
import type { DiffRow, DiffStatus } from '@/app/lib/queries/inspection-compare'
import {
  ITEM_CONDITION_LABELS,
  CONDITION_BADGE,
} from '@/app/lib/schemas/inspection'
import type { ItemCondition } from '@/app/lib/schemas/inspection'
import { InspectionComparePhotos } from '@/app/ui/inspection-compare-photos'
import { PrintButton } from '@/app/ui/print-button'

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_LABEL: Record<DiffStatus, string> = {
  worse: 'Worse',
  same: 'Unchanged',
  better: 'Improved',
  new_damage: 'New damage',
  only_in_move_in: 'Only on move-in',
  only_in_move_out: 'Added on move-out',
  unrated: 'Unrated',
}

const STATUS_BADGE: Record<DiffStatus, string> = {
  worse: 'bg-orange-100 text-orange-800',
  same: 'bg-zinc-100 text-zinc-700',
  better: 'bg-emerald-100 text-emerald-800',
  new_damage: 'bg-red-100 text-red-800',
  only_in_move_in: 'bg-zinc-100 text-zinc-500',
  only_in_move_out: 'bg-zinc-100 text-zinc-500',
  unrated: 'bg-zinc-100 text-zinc-500',
}

const STATUS_ROW_BG: Partial<Record<DiffStatus, string>> = {
  worse: 'bg-orange-50/60',
  new_damage: 'bg-red-50',
}

// Group rows by room for display, preserving the insertion order
function groupByRoom(rows: DiffRow[]): Map<string, DiffRow[]> {
  const map = new Map<string, DiffRow[]>()
  for (const row of rows) {
    const existing = map.get(row.room) ?? []
    existing.push(row)
    map.set(row.room, existing)
  }
  return map
}

function conditionBadge(c: ItemCondition | null) {
  if (c === null) {
    return <span className="text-xs text-zinc-400">Not rated</span>
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONDITION_BADGE[c]}`}
    >
      {ITEM_CONDITION_LABELS[c]}
    </span>
  )
}

export default async function InspectionComparePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pair = await getInspectionPair(id)
  if (!pair) notFound()

  const { focus, moveIn, moveOut, rows, summary } = pair

  if (focus.type === 'periodic') {
    return (
      <div>
        <div className="mb-4">
          <Link
            href={`/dashboard/properties/inspections/${id}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to inspection
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
          <h1 className="text-base font-semibold text-zinc-900">
            Comparison is only available for move-in / move-out inspections
          </h1>
          <p className="mt-2">
            This is a periodic walkthrough. Compare needs a matching pair on the
            same lease.
          </p>
        </div>
      </div>
    )
  }

  // If there's no opposite, show an empty state guiding the landlord
  // to create one.
  if (!moveIn || !moveOut) {
    const missingType =
      focus.type === 'move_in' ? 'move-out' : 'move-in'
    return (
      <div>
        <div className="mb-4">
          <Link
            href={`/dashboard/properties/inspections/${id}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to inspection
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h1 className="text-lg font-semibold text-zinc-900">
            No matching {missingType} inspection yet
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            You need both a move-in and a move-out inspection on this lease to
            see a comparison. Create the missing {missingType} inspection first.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties/inspections/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Start the {missingType} inspection
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const grouped = groupByRoom(rows)
  const rooms = Array.from(grouped.keys())
  const damageRows = rows.filter(
    (r) => r.status === 'worse' || r.status === 'new_damage',
  )

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link
          href={`/dashboard/properties/inspections/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to inspection
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Move-in vs move-out comparison
        </h1>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-zinc-700 md:grid-cols-2">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Move-in
            </div>
            <div className="mt-1">
              Scheduled: {formatDate(moveIn.scheduled_for)}
            </div>
            <div>Completed: {formatDateTime(moveIn.completed_at)}</div>
            <div>Tenant signed: {formatDateTime(moveIn.tenant_signed_at)}</div>
            <Link
              href={`/dashboard/properties/inspections/${moveIn.id}`}
              className="mt-1 inline-block text-xs text-indigo-700 hover:underline"
            >
              Open move-in inspection →
            </Link>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Move-out
            </div>
            <div className="mt-1">
              Scheduled: {formatDate(moveOut.scheduled_for)}
            </div>
            <div>Completed: {formatDateTime(moveOut.completed_at)}</div>
            <div>
              Tenant signed: {formatDateTime(moveOut.tenant_signed_at)}
            </div>
            <Link
              href={`/dashboard/properties/inspections/${moveOut.id}`}
              className="mt-1 inline-block text-xs text-indigo-700 hover:underline"
            >
              Open move-out inspection →
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <SummaryStat
            label="New damage"
            value={summary.newDamage}
            emphasis={summary.newDamage > 0 ? 'red' : undefined}
          />
          <SummaryStat
            label="Worse"
            value={summary.worse}
            emphasis={summary.worse > 0 ? 'orange' : undefined}
          />
          <SummaryStat label="Unchanged" value={summary.same} />
          <SummaryStat label="Improved" value={summary.better} />
          <SummaryStat label="Only on move-in" value={summary.onlyInMoveIn} />
          <SummaryStat label="Added on move-out" value={summary.onlyInMoveOut} />
          <SummaryStat label="Unrated" value={summary.unrated} />
          <SummaryStat label="Total items" value={summary.total} />
        </div>

        {/* Print button */}
        <div className="mt-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
      </div>

      {/* Damage summary callout — visible only when there's damage */}
      {damageRows.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-red-900">
            Damage summary ({damageRows.length}{' '}
            {damageRows.length === 1 ? 'item' : 'items'})
          </h2>
          <p className="mt-1 text-xs text-red-800">
            Items where the move-out condition is worse than the move-in
            condition. Review before deducting from the security deposit.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-red-900">
            {damageRows.map((r, idx) => (
              <li key={idx}>
                <span className="font-medium">
                  {r.room} — {r.item}
                </span>
                : {' '}
                {r.move_in_condition
                  ? ITEM_CONDITION_LABELS[r.move_in_condition]
                  : 'Not rated'}
                {' → '}
                {r.move_out_condition
                  ? ITEM_CONDITION_LABELS[r.move_out_condition]
                  : 'Not rated'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rows grouped by room */}
      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No items in either inspection.
        </div>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => {
            const roomRows = grouped.get(room) ?? []
            return (
              <section key={room}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                  {room}
                </h2>
                <div className="space-y-2">
                  {roomRows.map((row, idx) => (
                    <div
                      key={idx}
                      className={`rounded-md border border-zinc-200 bg-white p-3 ${
                        STATUS_ROW_BG[row.status] ?? ''
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="font-medium text-zinc-900">
                          {row.item}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status]}`}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Move-in
                          </div>
                          <div className="mt-1">
                            {conditionBadge(row.move_in_condition)}
                          </div>
                          {row.move_in_notes && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
                              {row.move_in_notes}
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Move-out
                          </div>
                          <div className="mt-1">
                            {conditionBadge(row.move_out_condition)}
                          </div>
                          {row.move_out_notes && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
                              {row.move_out_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <InspectionComparePhotos
                        moveInPhotos={row.move_in_photos}
                        moveOutPhotos={row.move_out_photos}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  emphasis,
}: {
  label: string
  value: number
  emphasis?: 'red' | 'orange'
}) {
  const color =
    emphasis === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
      : emphasis === 'orange'
        ? 'border-orange-200 bg-orange-50 text-orange-900'
        : 'border-zinc-200 bg-zinc-50 text-zinc-700'
  return (
    <div className={`rounded-md border px-2.5 py-1.5 ${color}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  )
}

