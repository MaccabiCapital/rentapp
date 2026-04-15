import {
  TEAM_ROLE_LABELS,
  type TeamRole,
} from '@/app/lib/schemas/team'

const ROLE_CLASSES: Record<TeamRole, string> = {
  accountant: 'bg-indigo-100 text-indigo-800',
  maintenance: 'bg-orange-100 text-orange-800',
  locksmith: 'bg-yellow-100 text-yellow-800',
  plumber: 'bg-cyan-100 text-cyan-800',
  electrician: 'bg-amber-100 text-amber-800',
  hvac: 'bg-sky-100 text-sky-800',
  landscaper: 'bg-green-100 text-green-800',
  cleaning: 'bg-emerald-100 text-emerald-800',
  lawyer: 'bg-purple-100 text-purple-800',
  paralegal: 'bg-violet-100 text-violet-800',
  insurance_agent: 'bg-pink-100 text-pink-800',
  real_estate_agent: 'bg-rose-100 text-rose-800',
  inspector: 'bg-teal-100 text-teal-800',
  contractor: 'bg-red-100 text-red-800',
  sheriff_office: 'bg-slate-200 text-slate-900',
  property_manager: 'bg-blue-100 text-blue-800',
  other: 'bg-zinc-100 text-zinc-700',
}

export function TeamRoleBadge({ role }: { role: TeamRole }) {
  const classes = ROLE_CLASSES[role] ?? 'bg-zinc-100 text-zinc-700'
  const label = TEAM_ROLE_LABELS[role] ?? role
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
