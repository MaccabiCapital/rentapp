import {
  COMM_CHANNEL_ICONS,
  COMM_CHANNEL_LABELS,
  type Communication,
} from '@/app/lib/schemas/communications'

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CommunicationsTimelineItem({
  entry,
}: {
  entry: Communication
}) {
  const isInbound = entry.direction === 'inbound'
  const icon = COMM_CHANNEL_ICONS[entry.channel]
  const channelLabel = COMM_CHANNEL_LABELS[entry.channel]
  const directionLabel = isInbound ? 'Received' : 'Sent'
  const sourceLabel =
    entry.created_by === 'webhook'
      ? ' · auto-captured'
      : entry.created_by === 'system'
        ? ' · system'
        : ''

  return (
    <li className="flex items-start gap-3 p-4">
      <div
        className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-medium ${
          isInbound
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-zinc-100 text-zinc-700'
        }`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-600">
            {directionLabel} · {channelLabel}
            <span className="text-zinc-400">{sourceLabel}</span>
          </div>
          <time
            className="text-xs text-zinc-500"
            dateTime={entry.created_at}
          >
            {formatTimestamp(entry.created_at)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
          {entry.content}
        </p>
      </div>
    </li>
  )
}
