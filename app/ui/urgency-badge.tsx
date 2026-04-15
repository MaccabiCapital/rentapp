import { URGENCY_LABELS, type Urgency } from '@/app/lib/schemas/maintenance'

const URGENCY_CLASSES: Record<Urgency, string> = {
  low: 'bg-zinc-100 text-zinc-600',
  normal: 'bg-zinc-100 text-zinc-700',
  high: 'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800 ring-1 ring-red-300',
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const classes = URGENCY_CLASSES[urgency] ?? 'bg-zinc-100 text-zinc-700'
  const label = URGENCY_LABELS[urgency] ?? urgency
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
