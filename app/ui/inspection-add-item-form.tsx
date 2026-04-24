'use client'

// ============================================================
// Add-an-item inline form — part of the inspection detail page
// ============================================================

import { useActionState, useRef, useEffect } from 'react'
import { addInspectionItem } from '@/app/actions/inspections'
import { emptyActionState } from '@/app/lib/types'

export function InspectionAddItemForm({
  inspectionId,
  nextSortOrder,
}: {
  inspectionId: string
  nextSortOrder: number
}) {
  const [state, formAction, isPending] = useActionState(
    addInspectionItem,
    emptyActionState,
  )
  const formRef = useRef<HTMLFormElement>(null)

  // Reset fields after a successful add so the next item starts blank
  useEffect(() => {
    if (state.success === true && formRef.current) {
      formRef.current.reset()
    }
  }, [state])

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-3"
    >
      <input type="hidden" name="inspection_id" value={inspectionId} />
      <input type="hidden" name="sort_order" value={nextSortOrder} />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <input
            type="text"
            name="room"
            placeholder="Room (e.g. Garage)"
            required
            className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.room && (
            <p className="mt-1 text-xs text-red-600">{errors.room[0]}</p>
          )}
        </div>
        <div>
          <input
            type="text"
            name="item"
            placeholder="Item (e.g. Door opener)"
            required
            className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.item && (
            <p className="mt-1 text-xs text-red-600">{errors.item[0]}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-900 disabled:bg-zinc-400"
        >
          {isPending ? 'Adding…' : 'Add item'}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
    </form>
  )
}
