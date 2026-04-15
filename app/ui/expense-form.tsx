'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_VALUES,
  type Expense,
} from '@/app/lib/schemas/expense'
import type { TeamPickerOption } from '@/app/lib/queries/team'
import { TeamMemberPicker } from './team-member-picker'

type PropertyOption = {
  id: string
  name: string
}

type ExpenseFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Expense
  defaultPropertyId?: string | null
  propertyOptions: PropertyOption[]
  teamOptions?: TeamPickerOption[]
  submitLabel?: string
}

export function ExpenseForm({
  action,
  defaultValues,
  defaultPropertyId,
  propertyOptions,
  teamOptions = [],
  submitLabel = 'Save expense',
}: ExpenseFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      {propertyOptions.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Add a property first before logging an expense.
        </div>
      ) : (
        <div>
          <label
            htmlFor="property_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Property<span className="ml-0.5 text-red-600">*</span>
          </label>
          <select
            id="property_id"
            name="property_id"
            required
            defaultValue={
              defaultValues?.property_id ?? defaultPropertyId ?? ''
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— pick a property —</option>
            {propertyOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.property_id && (
            <p className="mt-1 text-sm text-red-600">
              {errors.property_id.join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-zinc-900"
          >
            Category<span className="ml-0.5 text-red-600">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={defaultValues?.category ?? 'repairs'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {EXPENSE_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-zinc-900"
          >
            Amount<span className="ml-0.5 text-red-600">*</span>
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
              $
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaultValues?.amount?.toString() ?? ''}
              className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.amount.join(' ')}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="incurred_on"
          className="block text-sm font-medium text-zinc-900"
        >
          Date<span className="ml-0.5 text-red-600">*</span>
        </label>
        <input
          id="incurred_on"
          name="incurred_on"
          type="date"
          required
          defaultValue={defaultValues?.incurred_on ?? ''}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors.incurred_on && (
          <p className="mt-1 text-sm text-red-600">
            {errors.incurred_on.join(' ')}
          </p>
        )}
      </div>

      <TeamMemberPicker
        options={teamOptions}
        textFieldName="vendor"
        idFieldName="team_member_id"
        label="Vendor"
        placeholder="Pick from My Team or type a name"
        defaultValue={defaultValues?.vendor ?? ''}
        helpText={
          teamOptions.length === 0
            ? 'Add people to My Team to auto-link expenses to their profile.'
            : 'Start typing — your team auto-completes. Linked expenses roll up into the team member profile.'
        }
      />

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-900"
        >
          Description
        </label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="e.g. Q2 premium, faucet replacement"
          defaultValue={defaultValues?.description ?? ''}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || propertyOptions.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
