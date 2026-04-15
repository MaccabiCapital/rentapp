'use client'

// ============================================================
// ProspectStageButtons — context-aware stage advancement
// ============================================================

import { useState, useTransition } from 'react'
import { setProspectStage } from '@/app/actions/prospects'
import type { ProspectStage } from '@/app/lib/schemas/prospect'

type Transition = {
  to: ProspectStage
  label: string
  variant: 'primary' | 'default' | 'danger' | 'muted'
}

const TRANSITIONS: Record<ProspectStage, Transition[]> = {
  inquired: [
    { to: 'application_sent', label: 'Sent app', variant: 'primary' },
    { to: 'declined', label: 'Decline', variant: 'danger' },
    { to: 'withdrew', label: 'Withdrew', variant: 'muted' },
  ],
  application_sent: [
    { to: 'application_received', label: 'Received app', variant: 'primary' },
    { to: 'declined', label: 'Decline', variant: 'danger' },
    { to: 'withdrew', label: 'Withdrew', variant: 'muted' },
  ],
  application_received: [
    { to: 'screening', label: 'Start screening', variant: 'primary' },
    { to: 'declined', label: 'Decline', variant: 'danger' },
  ],
  screening: [
    { to: 'approved', label: 'Approve', variant: 'primary' },
    { to: 'declined', label: 'Decline', variant: 'danger' },
  ],
  approved: [
    { to: 'lease_signed', label: 'Lease signed', variant: 'primary' },
    { to: 'withdrew', label: 'Withdrew', variant: 'muted' },
  ],
  lease_signed: [],
  declined: [
    { to: 'inquired', label: 'Reopen', variant: 'default' },
  ],
  withdrew: [
    { to: 'inquired', label: 'Reopen', variant: 'default' },
  ],
}

const VARIANT_CLASSES: Record<Transition['variant'], string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  default: 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
  muted: 'border border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-100',
}

export function ProspectStageButtons({
  prospectId,
  currentStage,
}: {
  prospectId: string
  currentStage: ProspectStage
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const transitions = TRANSITIONS[currentStage] ?? []
  if (transitions.length === 0) return null

  function handleClick(to: ProspectStage) {
    setError(null)
    startTransition(async () => {
      const result = await setProspectStage(prospectId, to)
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
