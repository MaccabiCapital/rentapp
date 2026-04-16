// ============================================================
// Dashboard → Maintenance → [id] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMaintenanceRequest } from '@/app/lib/queries/maintenance'
import { MaintenanceStatusBadge } from '@/app/ui/maintenance-status-badge'
import { UrgencyBadge } from '@/app/ui/urgency-badge'
import { MaintenanceStatusButtons } from '@/app/ui/maintenance-status-buttons'
import { DeleteMaintenanceButton } from '@/app/ui/delete-maintenance-button'
import { PhotoGallery } from '@/app/ui/photo-gallery'
import { PhotoUploader } from '@/app/ui/photo-uploader'
import { CommunicationsTimeline } from '@/app/ui/communications-timeline'

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const request = await getMaintenanceRequest(id)
  if (!request) notFound()

  const totalCost = (request.cost_materials ?? 0) + (request.cost_labor ?? 0)
  const unitLabel = request.unit.unit_number ?? `Unit ${request.unit_id.slice(0, 8)}`

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/maintenance" className="hover:text-zinc-900">
          Maintenance
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{request.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {request.title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <MaintenanceStatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            <Link
              href={`/dashboard/properties/${request.unit.property_id}/units/${request.unit_id}`}
              className="text-indigo-600 hover:text-indigo-700"
            >
              {request.unit.property.name} · {unitLabel}
            </Link>
            {request.tenant && (
              <>
                {' '}
                · Reported by{' '}
                <Link
                  href={`/dashboard/tenants/${request.tenant.id}`}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {request.tenant.first_name} {request.tenant.last_name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href={`/dashboard/maintenance/${request.id}/edit`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </Link>
          </div>
          <MaintenanceStatusButtons
            requestId={request.id}
            currentStatus={request.status}
          />
        </div>
      </div>

      {request.description && (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
            {request.description}
          </p>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Assigned to" value={request.assigned_to} />
        <DetailRow label="Reported" value={formatDateTime(request.created_at)} />
        <DetailRow
          label="Resolved"
          value={request.resolved_at ? formatDateTime(request.resolved_at) : null}
        />
        <DetailRow
          label="Materials cost"
          value={request.cost_materials !== null ? formatCurrency(request.cost_materials) : null}
        />
        <DetailRow
          label="Labor cost"
          value={request.cost_labor !== null ? formatCurrency(request.cost_labor) : null}
        />
        <DetailRow
          label="Total cost"
          value={totalCost > 0 ? formatCurrency(totalCost) : null}
        />
        <DetailRow label="Notes" value={request.notes} />
      </dl>

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Photos ({request.photos.length})
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Attach photos of the damage or completed work.
        </p>
      </div>
      <div className="mb-6">
        <PhotoGallery
          entityType="maintenance"
          entityId={request.id}
          photos={request.photos}
          emptyMessage="No photos yet. Upload damage photos so you can decide urgency without driving there."
        />
      </div>
      <div>
        <PhotoUploader entityType="maintenance" entityId={request.id} />
      </div>

      <div className="mt-6 flex justify-end">
        <DeleteMaintenanceButton requestId={request.id} title={request.title} />
      </div>

      <CommunicationsTimeline
        entityType="maintenance_request"
        entityId={request.id}
        description="Calls, texts, and vendor updates for this job."
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? '—'}</dd>
    </div>
  )
}
