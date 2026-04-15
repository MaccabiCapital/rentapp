'use client'

// ============================================================
// ProspectForm — create + edit
// ============================================================

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  PROSPECT_SOURCE_LABELS,
  PROSPECT_SOURCES,
  PROSPECT_STAGE_LABELS,
  PROSPECT_STAGE_VALUES,
  type Prospect,
} from '@/app/lib/schemas/prospect'

type UnitOption = {
  id: string
  label: string
}

type ProspectFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Prospect
  defaultUnitId?: string | null
  unitOptions?: UnitOption[]
  mode: 'create' | 'edit'
  submitLabel?: string
}

export function ProspectForm({
  action,
  defaultValues,
  defaultUnitId,
  unitOptions,
  mode,
  submitLabel = 'Save prospect',
}: ProspectFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  // For datetime-local inputs we need `YYYY-MM-DDTHH:mm`
  const followUpDefault = defaultValues?.follow_up_at
    ? defaultValues.follow_up_at.slice(0, 16)
    : ''

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="First name"
          name="first_name"
          required
          defaultValue={defaultValues?.first_name ?? ''}
          errors={errors.first_name}
        />
        <Field
          label="Last name"
          name="last_name"
          defaultValue={defaultValues?.last_name ?? ''}
          errors={errors.last_name}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ''}
          errors={errors.email}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone ?? ''}
          errors={errors.phone}
        />
      </div>

      <div>
        <label htmlFor="unit_id" className="block text-sm font-medium text-zinc-900">
          Interested in unit
        </label>
        {unitOptions && unitOptions.length > 0 ? (
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={defaultValues?.unit_id ?? defaultUnitId ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— not yet picked —</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="hidden"
            name="unit_id"
            defaultValue={defaultValues?.unit_id ?? defaultUnitId ?? ''}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-zinc-900">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={defaultValues?.stage ?? 'inquired'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PROSPECT_STAGE_VALUES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="source"
            className="block text-sm font-medium text-zinc-900"
          >
            Source
          </label>
          <select
            id="source"
            name="source"
            defaultValue={defaultValues?.source ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— unknown —</option>
            {PROSPECT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="follow_up_at"
          className="block text-sm font-medium text-zinc-900"
        >
          Follow up by
        </label>
        <input
          id="follow_up_at"
          name="follow_up_at"
          type="datetime-local"
          defaultValue={followUpDefault}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          We&rsquo;ll flag this prospect in red when the date passes.
        </p>
      </div>

      <div>
        <label
          htmlFor="inquiry_message"
          className="block text-sm font-medium text-zinc-900"
        >
          Inquiry message
        </label>
        <textarea
          id="inquiry_message"
          name="inquiry_message"
          rows={3}
          defaultValue={defaultValues?.inquiry_message ?? ''}
          placeholder="What they said when they first reached out..."
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
          placeholder="Your private notes about this prospect..."
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Add prospect' : submitLabel}
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
  errors,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
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
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {errors && errors.length > 0 && (
        <p className="mt-1 text-sm text-red-600">{errors.join(' ')}</p>
      )}
    </div>
  )
}
