// ============================================================
// UpcomingEvents — "What needs attention" list for the dashboard
// ============================================================

import Link from 'next/link'
import type { UpcomingEvent } from '@/app/lib/queries/upcoming-events'

const TONE_CLASSES: Record<UpcomingEvent['severity'], string> = {
  red: 'bg-red-50 border-red-200 hover:border-red-400',
  amber: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
}

const ICON_CLASSES: Record<UpcomingEvent['severity'], string> = {
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
}

const TITLE_CLASSES: Record<UpcomingEvent['severity'], string> = {
  red: 'text-red-900',
  amber: 'text-amber-900',
  blue: 'text-blue-900',
}

const SUBTITLE_CLASSES: Record<UpcomingEvent['severity'], string> = {
  red: 'text-red-800',
  amber: 'text-amber-800',
  blue: 'text-blue-800',
}

export function UpcomingEvents({
  events,
  maxVisible = 10,
}: {
  events: UpcomingEvent[]
  maxVisible?: number
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-700">
          You&rsquo;re all caught up
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Nothing urgent. Expiring leases, overdue follow-ups, and open
          maintenance requests will show up here when they appear.
        </p>
      </div>
    )
  }

  const visible = events.slice(0, maxVisible)
  const hasMore = events.length > maxVisible

  // Count severity tiers for the summary line
  const redCount = events.filter((e) => e.severity === 'red').length
  const amberCount = events.filter((e) => e.severity === 'amber').length
  const blueCount = events.filter((e) => e.severity === 'blue').length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          What needs attention
        </h2>
        <div className="text-xs text-zinc-500">
          {redCount > 0 && (
            <span className="mr-3 font-medium text-red-700">
              {redCount} urgent
            </span>
          )}
          {amberCount > 0 && (
            <span className="mr-3 font-medium text-amber-700">
              {amberCount} soon
            </span>
          )}
          {blueCount > 0 && (
            <span className="font-medium text-blue-700">
              {blueCount} review
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((event) => (
          <Link
            key={event.id}
            href={event.href}
            className={`flex items-start gap-3 rounded-lg border p-4 transition ${TONE_CLASSES[event.severity]}`}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-sm font-semibold ${ICON_CLASSES[event.severity]}`}
              aria-hidden="true"
            >
              {event.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${TITLE_CLASSES[event.severity]}`}
              >
                {event.title}
              </p>
              <p
                className={`mt-0.5 text-xs ${SUBTITLE_CLASSES[event.severity]}`}
              >
                {event.subtitle}
              </p>
            </div>
            <div className={`flex-shrink-0 text-sm ${TITLE_CLASSES[event.severity]}`}>
              →
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <p className="mt-3 text-center text-xs text-zinc-500">
          Showing {maxVisible} of {events.length} · resolve these first, more
          will appear once cleared.
        </p>
      )}
    </div>
  )
}
