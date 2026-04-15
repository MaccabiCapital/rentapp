'use client'

// ============================================================
// MaintenanceStatusButtons — one-click workflow transitions
// ============================================================
//
// Shows only the transitions that make sense for the current
// status. The buttons call setMaintenanceStatus as a transition;
// cost entry is still done via Edit for fine control.

import { useState, useTransition } from 'react'
import { setMaintenanceStatus } from '@/app/actions/maintenance'
import type { MaintenanceStatus } from '@/app/lib/schemas/maintenance'

type Transition = {
  to: MaintenanceStatus
  label: string
  variant: 'primary' | 'default' | 'success' | 'muted'
}

const TRANSITIONS: Record<MaintenanceStatus, Transition[]> = {
  open: [
    { to: 'in_progress', label: 'Start work', variant: 'primary' },
    { to: 'awaiting_parts', label: 'Awaiting parts', variant: 'default' },
    { to: 'resolved', label: 'Mark resolved', variant: 'success' },
  ],
  in_progress: [
    { to: 'awaiting_parts', label: 'Awaiting parts', variant: 'default' },
    { to: 'resolved', label: 'Mark resolved', variant: 'success' },
  ],
  awaiting_parts: [
    { to: 'in_progress', label: 'Resume work', variant: 'primary' },
    { to: 'resolved', label: 'Mark resolved', variant: 'success' },
  ],
  resolved: [
    { to: 'closed', label: 'Close', variant: 'muted' },
    { to: 'in_progress', label: 'Reopen', variant: 'default' },
  ],
  closed: [
    { to: 'in_progress', label: 'Reopen', variant: 'default' },
  ],
}

const VARIANT_CLASSES: Record<Transition['variant'], string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700',
  default:
    'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
  success:
    'bg-green-600 text-white hover:bg-green-700',
  muted:
    'border border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-100',
}

export function MaintenanceStatusButtons({
  requestId,
  currentStatus,
}: {
  requestId: string
  currentStatus: MaintenanceStatus
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const transitions = TRANSITIONS[currentStatus] ?? []
  if (transitions.length === 0) return null

  function handleClick(to: MaintenanceStatus) {
    setError(null)
    startTransition(async () => {
      const result = await setMaintenanceStatus(requestId, to)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {transitions.map((t) => (
          <button
            key={t.to}
            type="button"
            disabled={isPending}
            onClick={() => handleClick(t.to)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[t.variant]}`}
          >
            {isPending ? '…' : t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
