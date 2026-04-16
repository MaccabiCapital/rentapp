'use client'

import { useState, useTransition } from 'react'
import {
  COMM_CHANNEL_ICONS,
  COMM_CHANNEL_LABELS,
  type Communication,
} from '@/app/lib/schemas/communications'
import {
  editCommunication,
  softDeleteCommunication,
} from '@/app/actions/communications'

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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.content)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
  const editedMarker =
    entry.metadata &&
    typeof entry.metadata === 'object' &&
    'edited_at' in entry.metadata
      ? ' · edited'
      : ''

  // Don't let users edit webhook-captured rows — those are an
  // audit record of what actually came in.
  const canEdit = entry.created_by !== 'webhook'

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await editCommunication(entry.id, draft)
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Failed to save.')
      } else {
        setEditing(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this entry?')) return
    setError(null)
    startTransition(async () => {
      const res = await softDeleteCommunication(entry.id)
      if (res && !res.success && 'message' in res) {
        setError(res.message ?? 'Failed to delete.')
      }
    })
  }

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
            <span className="text-zinc-400">
              {sourceLabel}
              {editedMarker}
            </span>
          </div>
          <time className="text-xs text-zinc-500" dateTime={entry.created_at}>
            {formatTimestamp(entry.created_at)}
          </time>
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || draft.trim().length === 0}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(entry.content)
                  setEditing(false)
                  setError(null)
                }}
                disabled={isPending}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
            {entry.content}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {!editing && (
          <div className="mt-2 flex gap-3 text-xs text-zinc-400">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="hover:text-indigo-600"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="hover:text-red-600 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
