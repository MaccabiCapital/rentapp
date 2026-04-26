'use client'

// ============================================================
// Deduction list editor
// ============================================================
//
// Editable list of deductions. Each row has its own form for
// update/delete. Add-new form lives at the bottom. Read-only when
// the settlement is finalized or mailed.

import { useActionState, useState } from 'react'
import {
  addDeductionItem,
  updateDeductionItem,
  deleteDeductionItem,
} from '@/app/actions/security-deposits'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import {
  DEDUCTION_CATEGORY_VALUES,
  DEDUCTION_CATEGORY_LABELS,
  formatMoney,
  type DeductionItem,
} from '@/app/lib/schemas/security-deposit'

export function SettlementDeductionEditor({
  settlementId,
  items,
  isDraft,
}: {
  settlementId: string
  items: DeductionItem[]
  isDraft: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Itemized deductions
        </h3>
        {isDraft && (
          <span className="text-xs text-zinc-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No deductions. {isDraft ? 'Add one below.' : 'Full deposit refunded.'}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => (
            <DeductionRow
              key={item.id}
              item={item}
              settlementId={settlementId}
              isDraft={isDraft}
            />
          ))}
        </ul>
      )}

      {isDraft && (
        <div className="mt-6 border-t border-zinc-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Add deduction
          </h4>
          <AddDeductionForm settlementId={settlementId} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Single deduction row (edit / delete)
// ------------------------------------------------------------

function DeductionRow({
  item,
  settlementId,
  isDraft,
}: {
  item: DeductionItem
  settlementId: string
  isDraft: boolean
}) {
  const [editing, setEditing] = useState(false)
  const updateAction = updateDeductionItem.bind(null, item.id, settlementId)
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateAction,
    emptyActionState,
  )
  const updateErrors =
    updateState.success === false && 'errors' in updateState
      ? updateState.errors
      : {}
  const updateMessage =
    updateState.success === false && 'message' in updateState
      ? updateState.message
      : null

  if (!isDraft || !editing) {
    return (
      <li className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {DEDUCTION_CATEGORY_LABELS[item.category]}
              </span>
              <span className="font-medium text-zinc-900">
                {formatMoney(item.amount)}
              </span>
              {item.inspection_item_id && (
                <span className="text-xs text-zinc-400">
                  · from move-out inspection
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-700">{item.description}</p>
            {item.photos.length > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                {item.photos.length}{' '}
                {item.photos.length === 1 ? 'photo' : 'photos'} attached
              </p>
            )}
          </div>
          {isDraft && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Edit
              </button>
              <DeleteRowButton itemId={item.id} settlementId={settlementId} />
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <li className="py-3">
      <form action={updateFormAction} className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label
              htmlFor={`category-${item.id}`}
              className="block text-xs font-medium text-zinc-700"
            >
              Category
            </label>
            <select
              id={`category-${item.id}`}
              name="category"
              required
              defaultValue={item.category}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {DEDUCTION_CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {DEDUCTION_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label
              htmlFor={`amount-${item.id}`}
              className="block text-xs font-medium text-zinc-700"
            >
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id={`amount-${item.id}`}
              name="amount"
              required
              defaultValue={item.amount}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={`description-${item.id}`}
            className="block text-xs font-medium text-zinc-700"
          >
            Description
          </label>
          <input
            type="text"
            id={`description-${item.id}`}
            name="description"
            required
            defaultValue={item.description}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {updateErrors.description && (
            <p className="mt-1 text-xs text-red-600">
              {updateErrors.description[0]}
            </p>
          )}
          {updateErrors.amount && (
            <p className="mt-1 text-xs text-red-600">
              {updateErrors.amount[0]}
            </p>
          )}
        </div>
        {updateMessage && (
          <p className="text-xs text-red-600">{updateMessage}</p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isUpdating ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </li>
  )
}

// ------------------------------------------------------------
// Delete button
// ------------------------------------------------------------

function DeleteRowButton({
  itemId,
  settlementId,
}: {
  itemId: string
  settlementId: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!confirm('Remove this deduction?')) return
          setPending(true)
          setError(null)
          const result: ActionState = await deleteDeductionItem(
            itemId,
            settlementId,
          )
          setPending(false)
          if (result.success === false && 'message' in result) {
            setError(result.message ?? 'Could not delete.')
          }
        }}
        className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  )
}

// ------------------------------------------------------------
// Add deduction form
// ------------------------------------------------------------

function AddDeductionForm({ settlementId }: { settlementId: string }) {
  const [state, formAction, isPending] = useActionState(
    addDeductionItem,
    emptyActionState,
  )
  const errors = state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justAdded = state.success === true && !isPending

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="settlement_id" value={settlementId} />
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label
            htmlFor="add-category"
            className="block text-xs font-medium text-zinc-700"
          >
            Category
          </label>
          <select
            id="add-category"
            name="category"
            required
            defaultValue="other"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {DEDUCTION_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {DEDUCTION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1">
          <label
            htmlFor="add-amount"
            className="block text-xs font-medium text-zinc-700"
          >
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            id="add-amount"
            name="amount"
            required
            placeholder="0.00"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="add-description"
          className="block text-xs font-medium text-zinc-700"
        >
          Description
        </label>
        <input
          type="text"
          id="add-description"
          name="description"
          required
          placeholder="What was deducted, in plain English"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description[0]}</p>
        )}
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600">{errors.amount[0]}</p>
        )}
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
      <div className="flex items-center justify-between">
        {justAdded && (
          <span className="text-xs text-emerald-700">Added.</span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Adding…' : 'Add deduction'}
        </button>
      </div>
    </form>
  )
}
