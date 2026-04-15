'use client'

// ============================================================
// MaintenanceForm — create + edit in one component
// ============================================================
//
// Create mode is called from a unit page, so unit_id is already
// bound and the form doesn't need to pick a property. A tenant_id
// can be pre-filled from the active lease if present.
//
// Edit mode adds cost fields (materials + labor) since those are
// typically entered when marking resolved.

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_VALUES,
  URGENCY_LABELS,
  URGENCY_VALUES,
  type MaintenanceRequest,
} from '@/app/lib/schemas/maintenance'

type TenantOption = {
  id: string
  first_name: string
  last_name: string
}

type MaintenanceFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: MaintenanceRequest
  tenantOptions?: TenantOption[]
  defaultTenantId?: string | null
  mode: 'create' | 'edit'
  submitLabel?: string
}

export function MaintenanceForm({
  action,
  defaultValues,
  tenantOptions,
  defaultTenantId,
  mode,
  submitLabel = 'Save',
}: MaintenanceFormProps) {
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

      <Field
        label="Title"
        name="title"
        required
        placeholder="e.g. Leaking kitchen faucet"
        defaultValue={defaultValues?.title}
        errors={errors.title}
      />

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-zinc-900"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ''}
          placeholder="What's happening, when it started, what you've tried..."
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="urgency"
            className="block text-sm font-medium text-zinc-900"
          >
            Urgency
          </label>
          <select
            id="urgency"
            name="urgency"
            defaultValue={defaultValues?.urgency ?? 'normal'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {URGENCY_VALUES.map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-zinc-900"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? 'open'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {MAINTENANCE_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {MAINTENANCE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field
        label="Assigned to"
        name="assigned_to"
        placeholder="e.g. Bob the plumber, or Self"
        defaultValue={defaultValues?.assigned_to ?? ''}
        errors={errors.assigned_to}
      />

      {mode === 'create' && tenantOptions && tenantOptions.length > 0 && (
        <div>
          <label
            htmlFor="tenant_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Reported by (optional)
          </label>
          <select
            id="tenant_id"
            name="tenant_id"
            defaultValue={defaultTenantId ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— no tenant / landlord found it —</option>
            {tenantOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.last_name}, {t.first_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'edit' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyField
            label="Materials cost"
            name="cost_materials"
            defaultValue={defaultValues?.cost_materials?.toString() ?? ''}
            errors={errors.cost_materials}
          />
          <CurrencyField
            label="Labor cost"
            name="cost_labor"
            defaultValue={defaultValues?.cost_labor?.toString() ?? ''}
            errors={errors.cost_labor}
          />
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="Internal notes, invoice numbers, vendor contact info..."
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  required,
  type = 'text',
  defaultValue,
  placeholder,
  errors,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  defaultValue?: string
  placeholder?: string
  errors?: string[]
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-900">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {errors && errors.length > 0 && (
        <p className="mt-1 text-sm text-red-600">{errors.join(' ')}</p>
      )}
    </div>
  )
}

function CurrencyField(props: {
  label: string
  name: string
  defaultValue?: string
  errors?: string[]
}) {
  return (
    <div>
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-zinc-900"
      >
        {props.label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
          $
        </span>
        <input
          id={props.name}
          name={props.name}
          type="number"
          step="0.01"
          min="0"
          defaultValue={props.defaultValue}
          className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {props.errors && props.errors.length > 0 && (
        <p className="mt-1 text-sm text-red-600">{props.errors.join(' ')}</p>
      )}
    </div>
  )
}
