'use client'

import { useActionState, useState, useMemo } from 'react'
import type { ActionState } from '@/app/lib/types'
import type { Listing } from '@/app/lib/schemas/listing'

type PropertyOption = {
  id: string
  name: string
  units: Array<{
    id: string
    unit_number: string | null
    status: string
  }>
}

type ListingFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Listing
  propertyOptions: PropertyOption[]
  defaultPropertyId?: string | null
  defaultUnitId?: string | null
  submitLabel?: string
}

export function ListingForm({
  action,
  defaultValues,
  propertyOptions,
  defaultPropertyId,
  defaultUnitId,
  submitLabel = 'Save listing',
}: ListingFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultValues?.property_id ?? defaultPropertyId ?? '',
  )

  const unitsForSelected = useMemo(() => {
    const prop = propertyOptions.find((p) => p.id === selectedPropertyId)
    return prop?.units ?? []
  }, [propertyOptions, selectedPropertyId])

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      {propertyOptions.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Add a property first before creating a listing.
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
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
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

      {selectedPropertyId && unitsForSelected.length > 0 && (
        <div>
          <label
            htmlFor="unit_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Unit
          </label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={defaultValues?.unit_id ?? defaultUnitId ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— whole property —</option>
            {unitsForSelected.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_number ?? 'Main'} · {u.status}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            If this property is a single-family home, leave the unit blank.
          </p>
        </div>
      )}

      <Field
        label="Title"
        name="title"
        required
        placeholder="e.g. Sunny 2BR in Davis Square"
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
          rows={6}
          placeholder="Pitch the unit: neighborhood, what's nearby, why it's a good rental, recent upgrades. This is what prospects read."
          defaultValue={defaultValues?.description ?? ''}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="headline_rent"
            className="block text-sm font-medium text-zinc-900"
          >
            Headline rent
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
              $
            </span>
            <input
              id="headline_rent"
              name="headline_rent"
              type="number"
              step="0.01"
              min="0"
              placeholder="2400"
              defaultValue={defaultValues?.headline_rent?.toString() ?? ''}
              className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <Field
          label="Available on"
          name="available_on"
          type="date"
          defaultValue={defaultValues?.available_on ?? ''}
          errors={errors.available_on}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Contact email"
          name="contact_email"
          type="email"
          defaultValue={defaultValues?.contact_email ?? ''}
          errors={errors.contact_email}
        />
        <Field
          label="Contact phone"
          name="contact_phone"
          type="tel"
          defaultValue={defaultValues?.contact_phone ?? ''}
          errors={errors.contact_phone}
        />
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={defaultValues?.is_active ?? true}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">
              Active
            </span>
            <span className="block text-xs text-zinc-500">
              Public URL is live and accepts inquiries. Uncheck to hide.
            </span>
          </span>
        </label>
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

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
  errors,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
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
