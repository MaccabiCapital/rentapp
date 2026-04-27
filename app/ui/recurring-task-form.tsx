'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  createRecurringTask,
  updateRecurringTask,
} from '@/app/actions/recurring-maintenance'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import {
  FREQUENCY_UNIT_VALUES,
  COMMON_CATEGORIES,
  type RecurringMaintenanceTask,
} from '@/app/lib/schemas/recurring-maintenance'

type PropertyOption = { id: string; name: string }
type UnitOption = {
  id: string
  unit_number: string | null
  property_name: string
}

export function RecurringTaskForm({
  existing,
  propertyOptions,
  unitOptions,
}: {
  existing?: RecurringMaintenanceTask
  propertyOptions: PropertyOption[]
  unitOptions: UnitOption[]
}) {
  const action = existing
    ? updateRecurringTask.bind(null, existing.id)
    : (createRecurringTask as (
        prev: ActionState,
        fd: FormData,
      ) => Promise<ActionState>)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  const initialScope: 'property' | 'unit' = existing
    ? existing.unit_id
      ? 'unit'
      : 'property'
    : 'property'
  const [scope, setScope] = useState<'property' | 'unit'>(initialScope)

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="scope" value={scope} />

      <Section title="What & where">
        <Field
          label="Title"
          name="title"
          required
          placeholder="e.g., HVAC twice-yearly service"
          defaultValue={existing?.title ?? ''}
          error={errors.title?.[0]}
        />
        <div>
          <label className="block text-xs font-medium text-zinc-700">
            Category
          </label>
          <select
            name="category"
            defaultValue={existing?.category ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Pick…</option>
            {COMMON_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">
            Scope
          </label>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scope === 'property'}
                onChange={() => setScope('property')}
              />
              Property-level (e.g. roof, exterior)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scope === 'unit'}
                onChange={() => setScope('unit')}
              />
              Unit-specific (e.g. in-unit smoke detector)
            </label>
          </div>
        </div>

        {scope === 'property' ? (
          <div>
            <label
              htmlFor="property_id"
              className="block text-xs font-medium text-zinc-700"
            >
              Property
            </label>
            <select
              id="property_id"
              name="property_id"
              required
              defaultValue={existing?.property_id ?? ''}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Pick a property…
              </option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label
              htmlFor="unit_id"
              className="block text-xs font-medium text-zinc-700"
            >
              Unit
            </label>
            <select
              id="unit_id"
              name="unit_id"
              required
              defaultValue={existing?.unit_id ?? ''}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Pick a unit…
              </option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.property_name} · {u.unit_number ?? 'unit'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-700">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={existing?.description ?? ''}
            placeholder="Anything specific the vendor needs to know."
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </Section>

      <Section title="Frequency">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Every"
            name="frequency_value"
            type="number"
            min="1"
            required
            defaultValue={existing?.frequency_value?.toString() ?? '6'}
            error={errors.frequency_value?.[0]}
          />
          <div>
            <label className="block text-xs font-medium text-zinc-700">
              Unit
            </label>
            <select
              name="frequency_unit"
              required
              defaultValue={existing?.frequency_unit ?? 'months'}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {FREQUENCY_UNIT_VALUES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Lead time (alert N days before due)"
            name="lead_time_days"
            type="number"
            min="0"
            max="365"
            defaultValue={existing?.lead_time_days?.toString() ?? '14'}
            error={errors.lead_time_days?.[0]}
          />
        </div>
        <Field
          label="Next due date"
          name="next_due_date"
          type="date"
          required
          defaultValue={existing?.next_due_date ?? ''}
          error={errors.next_due_date?.[0]}
        />
      </Section>

      <Section title="Vendor (optional)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Name"
            name="vendor_name"
            defaultValue={existing?.vendor_name ?? ''}
            placeholder="e.g., Joe's HVAC"
          />
          <Field
            label="Phone"
            name="vendor_phone"
            type="tel"
            defaultValue={existing?.vendor_phone ?? ''}
          />
          <Field
            label="Email"
            name="vendor_email"
            type="email"
            defaultValue={existing?.vendor_email ?? ''}
          />
        </div>
      </Section>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        {justSaved && (
          <span className="text-xs text-emerald-700">Saved.</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={
              existing
                ? `/dashboard/properties/maintenance/recurring/${existing.id}`
                : '/dashboard/properties/maintenance/recurring'
            }
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isPending ? 'Saving…' : existing ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </form>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  min,
  max,
  required,
  placeholder,
  defaultValue,
  error,
}: {
  label: string
  name: string
  type?: string
  min?: string
  max?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={min}
        max={max}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
