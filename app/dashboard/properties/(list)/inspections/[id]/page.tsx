// ============================================================
// Dashboard → Inspections → [id] detail page
// ============================================================
//
// The walkthrough view. Header shows lease context + status.
// Items are grouped by room — each renders a card with editable
// room/item/condition/notes, plus a photo uploader and gallery.
// Footer captures tenant + landlord signatures.
//
// Items can only be edited while the inspection is draft or in
// progress. Once marked complete (or signed), editing is locked
// and a "Re-open for edits" button appears in the header.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInspection } from '@/app/lib/queries/inspections'
import { hasMatchingOppositeInspection } from '@/app/lib/queries/inspection-compare'
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
  CONDITION_BADGE,
} from '@/app/lib/schemas/inspection'
import type {
  InspectionItem,
  InspectionStatus,
  InspectionType,
  ItemCondition,
} from '@/app/lib/schemas/inspection'
import { InspectionItemCard } from '@/app/ui/inspection-item-card'
import { InspectionAddItemForm } from '@/app/ui/inspection-add-item-form'
import { InspectionSignForm } from '@/app/ui/inspection-sign-form'
import { InspectionHeaderActions } from '@/app/ui/inspection-header-actions'
import { PhotoGallery } from '@/app/ui/photo-gallery'
import { PhotoUploader } from '@/app/ui/photo-uploader'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US')
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

function groupByRoom(items: InspectionItem[]): Map<string, InspectionItem[]> {
  const map = new Map<string, InspectionItem[]>()
  for (const it of items) {
    const existing = map.get(it.room) ?? []
    existing.push(it)
    map.set(it.room, existing)
  }
  return map
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getInspection(id)
  if (!result) notFound()
  const { inspection, items } = result

  const canCompare =
    (inspection.type === 'move_in' || inspection.type === 'move_out') &&
    (await hasMatchingOppositeInspection(
      inspection.lease_id,
      inspection.type,
      inspection.id,
    ))
  const compareTargetLabel =
    inspection.type === 'move_in' ? 'move-out' : 'move-in'

  const tenantName = inspection.lease?.tenant
    ? `${inspection.lease.tenant.first_name} ${inspection.lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const unitLabel = inspection.lease?.unit?.unit_number ?? 'Unit'
  const propertyName =
    inspection.lease?.unit?.property?.name ?? 'Unknown property'

  const locked =
    inspection.status === 'completed' || inspection.status === 'signed'

  const grouped = groupByRoom(items)
  // Sort rooms by the minimum sort_order in each room, so the starter
  // checklist's natural order is preserved.
  const rooms = Array.from(grouped.keys()).sort((a, b) => {
    const aMin = Math.min(...(grouped.get(a) ?? []).map((i) => i.sort_order))
    const bMin = Math.min(...(grouped.get(b) ?? []).map((i) => i.sort_order))
    return aMin - bMin
  })

  const maxSort = items.reduce(
    (acc, it) => Math.max(acc, it.sort_order),
    -1,
  )
  const nextSortOrder = maxSort + 1

  // Condition distribution for the progress summary
  const ratingCounts = items.reduce<Record<ItemCondition, number>>(
    (acc, it) => {
      if (it.condition) acc[it.condition] = (acc[it.condition] ?? 0) + 1
      return acc
    },
    {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      damaged: 0,
    },
  )

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link
          href="/dashboard/properties/inspections"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Inspections
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[inspection.type]}`}
              >
                {INSPECTION_TYPE_LABELS[inspection.type]}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inspection.status]}`}
              >
                {INSPECTION_STATUS_LABELS[inspection.status]}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              {propertyName} · {unitLabel}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Tenant: <span className="font-medium">{tenantName}</span>
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-600 md:grid-cols-4">
              <div>
                <dt className="font-semibold uppercase tracking-wide">
                  Scheduled
                </dt>
                <dd className="mt-0.5">{formatDate(inspection.scheduled_for)}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">
                  Completed
                </dt>
                <dd className="mt-0.5">
                  {formatDateTime(inspection.completed_at)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">
                  Tenant signed
                </dt>
                <dd className="mt-0.5">
                  {formatDateTime(inspection.tenant_signed_at)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">
                  Landlord signed
                </dt>
                <dd className="mt-0.5">
                  {formatDateTime(inspection.landlord_signed_at)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            {canCompare && (
              <Link
                href={`/dashboard/properties/inspections/${inspection.id}/compare`}
                className="inline-flex items-center rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 print:hidden"
              >
                Compare to {compareTargetLabel} →
              </Link>
            )}
            <InspectionHeaderActions
              inspectionId={inspection.id}
              status={inspection.status}
              totalItems={inspection.item_count}
              ratedItems={inspection.rated_count}
            />
          </div>
        </div>

        {inspection.notes && (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Overall notes
            </div>
            <p className="mt-1 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}

        {/* Progress */}
        <div className="mt-4 text-xs text-zinc-600">
          <span className="font-medium text-zinc-900">
            {inspection.rated_count} of {inspection.item_count} items rated
          </span>
          {inspection.item_count > 0 && (
            <span className="ml-3 inline-flex flex-wrap gap-1">
              {(['excellent', 'good', 'fair', 'poor', 'damaged'] as const).map(
                (c) =>
                  ratingCounts[c] > 0 ? (
                    <span
                      key={c}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONDITION_BADGE[c]}`}
                    >
                      {ITEM_CONDITION_LABELS[c]}: {ratingCounts[c]}
                    </span>
                  ) : null,
              )}
            </span>
          )}
        </div>
      </div>

      {/* Items grouped by room */}
      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No items yet. Add some below.
        </div>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => {
            const roomItems = (grouped.get(room) ?? []).sort(
              (a, b) => a.sort_order - b.sort_order,
            )
            return (
              <section key={room}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                  {room}
                </h2>
                <div className="space-y-3">
                  {roomItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <InspectionItemCard item={item} locked={locked} />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_3fr]">
                        {!locked && (
                          <PhotoUploader
                            entityType="inspection_items"
                            entityId={item.id}
                          />
                        )}
                        <div className={locked ? 'md:col-span-2' : ''}>
                          <PhotoGallery
                            entityType="inspection_items"
                            entityId={item.id}
                            photos={item.photos}
                            allowDelete={!locked}
                            emptyMessage="No photos for this item yet."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Add item */}
      {!locked && (
        <div className="mt-6 print:hidden">
          <InspectionAddItemForm
            inspectionId={inspection.id}
            nextSortOrder={nextSortOrder}
          />
        </div>
      )}

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <InspectionSignForm
          inspectionId={inspection.id}
          party="landlord"
          alreadySigned={!!inspection.landlord_signed_at}
          signedName={inspection.landlord_signature_name}
          signedAt={inspection.landlord_signed_at}
        />
        <InspectionSignForm
          inspectionId={inspection.id}
          party="tenant"
          alreadySigned={!!inspection.tenant_signed_at}
          signedName={inspection.tenant_signature_name}
          signedAt={inspection.tenant_signed_at}
        />
      </div>
    </div>
  )
}
