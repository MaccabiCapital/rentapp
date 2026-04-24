'use client'

// ============================================================
// InspectionItemCard — single-item editor with inline save
// ============================================================
//
// Renders one inspection_item row with editable room/item
// name, condition dropdown, notes textarea, and a delete
// button. Photos are rendered by the server component next to
// this card (PhotoGallery + PhotoUploader).
//
// Save happens on explicit button click — simpler than debounced
// onChange and gives clear feedback. The Save button disables
// until something has actually changed.

import { useActionState, useState, useTransition } from 'react'
import {
  updateInspectionItem,
  deleteInspectionItem,
} from '@/app/actions/inspections'
import {
  ITEM_CONDITION_VALUES,
  ITEM_CONDITION_LABELS,
} from '@/app/lib/schemas/inspection'
import type {
  InspectionItem,
  ItemCondition,
} from '@/app/lib/schemas/inspection'
import { emptyActionState, type ActionState } from '@/app/lib/types'

export function InspectionItemCard({
  item,
  locked,
}: {
  item: InspectionItem
  locked: boolean
}) {
  const boundUpdate = updateInspectionItem.bind(
    null,
    item.id,
    item.inspection_id,
  )
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    boundUpdate,
    emptyActionState,
  )
  const [isDeleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true

  async function handleDelete() {
    startDelete(async () => {
      await deleteInspectionItem(item.id, item.inspection_id)
    })
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Room
            </label>
            <input
              type="text"
              name="room"
              defaultValue={item.room}
              disabled={locked}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
            {errors.room && (
              <p className="mt-1 text-xs text-red-600">{errors.room[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Item
            </label>
            <input
              type="text"
              name="item"
              defaultValue={item.item}
              disabled={locked}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
            {errors.item && (
              <p className="mt-1 text-xs text-red-600">{errors.item[0]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Condition
            </label>
            <select
              name="condition"
              defaultValue={(item.condition as ItemCondition | null) ?? ''}
              disabled={locked}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            >
              <option value="">— not rated —</option>
              {ITEM_CONDITION_VALUES.map((c) => (
                <option key={c} value={c}>
                  {ITEM_CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={item.notes ?? ''}
              disabled={locked}
              placeholder="Any detail worth remembering — scratches, wear, colors, serial numbers…"
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </div>
        </div>

        {message && (
          <p className="text-xs text-red-600">{message}</p>
        )}

        {!locked && (
          <div className="flex items-center justify-between gap-2">
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">Delete this item?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:bg-red-400"
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-zinc-500 hover:text-red-600"
                >
                  Delete item
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {justSaved && (
                <span className="text-xs text-emerald-600">Saved</span>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
