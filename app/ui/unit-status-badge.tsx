// ============================================================
// UnitStatusBadge — colored chip for unit_status enum
// ============================================================

import { UNIT_STATUS_LABELS, type UnitStatus } from '@/app/lib/schemas/unit'

const STATUS_CLASSES: Record<UnitStatus, string> = {
  occupied: 'bg-green-100 text-green-800',
  vacant: 'bg-zinc-100 text-zinc-700',
  pending: 'bg-yellow-100 text-yellow-800',
  notice_given: 'bg-orange-100 text-orange-800',
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const classes = STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-700'
  const label = UNIT_STATUS_LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
