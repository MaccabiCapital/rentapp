import {
  PROSPECT_STAGE_LABELS,
  type ProspectStage,
} from '@/app/lib/schemas/prospect'

const STAGE_CLASSES: Record<ProspectStage, string> = {
  inquired: 'bg-zinc-100 text-zinc-700',
  application_sent: 'bg-blue-100 text-blue-800',
  application_received: 'bg-indigo-100 text-indigo-800',
  screening: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  lease_signed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  withdrew: 'bg-zinc-100 text-zinc-500',
}

export function ProspectStageBadge({ stage }: { stage: ProspectStage }) {
  const classes = STAGE_CLASSES[stage] ?? 'bg-zinc-100 text-zinc-700'
  const label = PROSPECT_STAGE_LABELS[stage] ?? stage
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
