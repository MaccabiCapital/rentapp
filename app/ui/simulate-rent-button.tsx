'use client'

import { useState, useTransition } from 'react'
import { simulateRentCycle } from '@/app/actions/rent'
import { ConfirmDialog } from './confirm-dialog'

export function SimulateRentButton() {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setMessage(null)
    startTransition(async () => {
      const result = await simulateRentCycle()
      if (result && !result.success && 'message' in result) {
        setMessage(result.message ?? 'Something went wrong.')
      } else {
        setMessage(null)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={isPending}
            className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Simulating…' : 'Simulate rent cycle'}
          </button>
        }
        title="Simulate a rent cycle?"
        description="Marks every upcoming/due/overdue rent line in the next 3 weeks as paid and writes matching payment rows tagged [SIMULATED]. Use this to demo the flow — real rent collection via Stripe comes in Sprint 3."
        confirmLabel="Simulate"
        onConfirm={handleConfirm}
      />
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  )
}
