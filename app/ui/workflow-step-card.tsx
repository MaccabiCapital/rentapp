// ============================================================
// WorkflowStepCard — checklist row used by every workflow page
// ============================================================
//
// Inferred "done" state — the workflow doesn't track progress in
// its own table. Each step is a query against the actual entity
// (lease / inspection / notice / policy) that would exist if the
// step were complete. Cheap, reliable, and means the landlord
// can't get out of sync with the real data.

import Link from 'next/link'

export type WorkflowStepStatus = 'done' | 'ready' | 'skipped' | 'blocked'

const STATUS_COLORS: Record<
  WorkflowStepStatus,
  { border: string; bg: string; badge: string; badgeText: string }
> = {
  done: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    badge: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
  ready: {
    border: 'border-indigo-200',
    bg: 'bg-white',
    badge: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
  },
  skipped: {
    border: 'border-zinc-200',
    bg: 'bg-zinc-50/50',
    badge: 'bg-zinc-100',
    badgeText: 'text-zinc-600',
  },
  blocked: {
    border: 'border-zinc-200',
    bg: 'bg-zinc-50/50',
    badge: 'bg-zinc-100',
    badgeText: 'text-zinc-500',
  },
}

const STATUS_LABELS: Record<WorkflowStepStatus, string> = {
  done: 'Done',
  ready: 'Ready',
  skipped: 'Skipped',
  blocked: 'Blocked',
}

export function WorkflowStepCard({
  stepNumber,
  title,
  description,
  status,
  doneSummary,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  stepNumber: number
  title: string
  description: string
  status: WorkflowStepStatus
  doneSummary?: string
  actionHref?: string
  actionLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  const colors = STATUS_COLORS[status]

  return (
    <div
      className={`rounded-lg border p-4 ${colors.border} ${colors.bg}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            status === 'done'
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-300 bg-white text-zinc-700'
          }`}
        >
          {status === 'done' ? '✓' : stepNumber}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors.badge} ${colors.badgeText}`}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
          {doneSummary && status === 'done' && (
            <p className="mt-1 text-xs text-emerald-700">{doneSummary}</p>
          )}
          {(actionHref || secondaryHref) && status !== 'blocked' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actionHref && actionLabel && (
                <Link
                  href={actionHref}
                  className={
                    status === 'done'
                      ? 'rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50'
                      : 'rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700'
                  }
                >
                  {actionLabel}
                </Link>
              )}
              {secondaryHref && secondaryLabel && (
                <Link
                  href={secondaryHref}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {secondaryLabel}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
