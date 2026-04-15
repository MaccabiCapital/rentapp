import {
  MAINTENANCE_STATUS_LABELS,
  type MaintenanceStatus,
} from '@/app/lib/schemas/maintenance'

const STATUS_CLASSES: Record<MaintenanceStatus, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  awaiting_parts: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-zinc-100 text-zinc-700',
}

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus
}) {
  const classes = STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-700'
  const label = MAINTENANCE_STATUS_LABELS[status] ?? status
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
