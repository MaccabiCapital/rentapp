'use client'

// ============================================================
// PropertyForm — used by both /new and /[id]/edit pages
// ============================================================
//
// Uses useActionState with the ActionState shape from types.ts.
// The parent binds the action (for edit: `updateProperty.bind(null, id)`)
// and passes defaultValues when rendering the edit form.

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import type { Property } from '@/app/lib/schemas/property'

type PropertyFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Property
  submitLabel?: string
}

export function PropertyForm({
  action,
  defaultValues,
  submitLabel = 'Save property',
}: PropertyFormProps) {
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

      <Field label="Name" name="name" required defaultValue={defaultValues?.name} errors={errors.name} />
      <Field
        label="Street address"
        name="street_address"
        required
        defaultValue={defaultValues?.street_address}
        errors={errors.street_address}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="City" name="city" required defaultValue={defaultValues?.city} errors={errors.city} />
        <Field label="State" name="state" required defaultValue={defaultValues?.state} errors={errors.state} />
        <Field
          label="Postal code"
          name="postal_code"
          required
          defaultValue={defaultValues?.postal_code}
          errors={errors.postal_code}
        />
      </div>
      <Field
        label="Country"
        name="country"
        defaultValue={defaultValues?.country ?? 'US'}
        errors={errors.country}
      />
      <Field
        label="Property type"
        name="property_type"
        placeholder="e.g. duplex, single-family"
        defaultValue={defaultValues?.property_type ?? ''}
        errors={errors.property_type}
      />
      <Field
        label="Year built"
        name="year_built"
        type="number"
        defaultValue={defaultValues?.year_built?.toString() ?? ''}
        errors={errors.year_built}
      />
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ''}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <FieldErrors errors={errors.notes} />
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
  defaultValue?: string | number
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
      <FieldErrors errors={errors} />
    </div>
  )
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="mt-1 text-sm text-red-600">{errors.join(' ')}</p>
  )
}
