// ============================================================
// LeaseStatusBadge — colored chip for lease_status enum
// ============================================================

import { LEASE_STATUS_LABELS, type LeaseStatus } from '@/app/lib/schemas/lease'

const STATUS_CLASSES: Record<LeaseStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  active: 'bg-green-100 text-green-800',
  expired: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
  renewed: 'bg-indigo-100 text-indigo-800',
}

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  const classes = STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-700'
  const label = LEASE_STATUS_LABELS[status] ?? status
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
