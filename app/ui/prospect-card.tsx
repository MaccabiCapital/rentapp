// ============================================================
// ProspectCard — compact card used in kanban columns
// ============================================================

import Link from 'next/link'
import type { ProspectWithUnit } from '@/app/lib/queries/prospects'

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function displayName(p: ProspectWithUnit): string {
  const first = p.first_name?.trim()
  const last = p.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return p.email ?? p.phone ?? 'Unnamed prospect'
}

export function ProspectCard({
  prospect,
  nowMs,
}: {
  prospect: ProspectWithUnit
  nowMs: number
}) {
  const followUp = formatDate(prospect.follow_up_at)
  const isOverdue =
    prospect.follow_up_at !== null &&
    new Date(prospect.follow_up_at).getTime() < nowMs

  return (
    <Link
      href={`/dashboard/prospects/${prospect.id}`}
      className="block rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm hover:border-indigo-300 hover:shadow"
    >
      <div className="font-medium text-zinc-900">{displayName(prospect)}</div>
      {prospect.unit && (
        <div className="mt-1 text-xs text-zinc-500">
          {prospect.unit.property.name}
          {prospect.unit.unit_number ? ` · ${prospect.unit.unit_number}` : ''}
        </div>
      )}
      {prospect.email && (
        <div className="mt-1 truncate text-xs text-zinc-500">
          {prospect.email}
        </div>
      )}
      {followUp && (
        <div
          className={`mt-2 text-xs ${isOverdue ? 'font-medium text-red-600' : 'text-zinc-500'}`}
        >
          {isOverdue ? 'Overdue: ' : 'Follow up: '}
          {followUp}
        </div>
      )}
    </Link>
  )
}
