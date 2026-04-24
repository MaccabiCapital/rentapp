// ============================================================
// ActionItemsPanel — the "what to do next" card on the overview
// ============================================================

import Link from 'next/link'
import type {
  ActionItem,
  ActionSeverity,
} from '@/app/lib/queries/action-items'

const SEV_BADGE: Record<ActionSeverity, string> = {
  urgent: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-zinc-100 text-zinc-700',
}

const SEV_ROW: Record<ActionSeverity, string> = {
  urgent: 'border-red-200 bg-red-50/40',
  warning: 'border-amber-200 bg-amber-50/40',
  info: 'border-zinc-200 bg-white',
}

const SEV_LABEL: Record<ActionSeverity, string> = {
  urgent: 'Urgent',
  warning: 'Attention',
  info: 'Heads up',
}

export function ActionItemsPanel({
  items,
  maxVisible = 8,
}: {
  items: ActionItem[]
  maxVisible?: number
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg">✓</span>
          <h2 className="text-base font-semibold text-emerald-900">
            You&rsquo;re caught up
          </h2>
        </div>
        <p className="mt-1 text-sm text-emerald-800">
          Nothing urgent across your portfolio right now. The app will surface
          things here as they come up — expiring leases, unsigned inspections,
          notices that need serving, drafts awaiting review.
        </p>
      </div>
    )
  }

  const visible = items.slice(0, maxVisible)
  const hidden = items.length - visible.length

  const urgentCount = items.filter((i) => i.severity === 'urgent').length
  const warningCount = items.filter((i) => i.severity === 'warning').length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">
          What to do next
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {urgentCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
              {urgentCount} urgent
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              {warningCount} attention
            </span>
          )}
          <span className="text-zinc-500">
            {items.length} total
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {visible.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className={`flex items-start gap-3 rounded-md border p-3 transition hover:border-indigo-300 hover:shadow-sm ${SEV_ROW[it.severity]}`}
          >
            <span className="mt-0.5 w-5 text-center text-zinc-500">
              {it.icon}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEV_BADGE[it.severity]}`}
                >
                  {SEV_LABEL[it.severity]}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {it.category}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-medium text-zinc-900">
                {it.title}
              </div>
              <div className="mt-0.5 text-xs text-zinc-600">{it.body}</div>
            </div>
            <span className="mt-1 text-xs text-indigo-600">Open →</span>
          </Link>
        ))}
      </div>
      {hidden > 0 && (
        <div className="mt-2 text-xs text-zinc-500">
          …and {hidden} more item{hidden === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}
