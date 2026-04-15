'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  PREFERRED_CONTACT_LABELS,
  PREFERRED_CONTACT_VALUES,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_VALUES,
  type TeamMember,
} from '@/app/lib/schemas/team'

type TeamFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: TeamMember
  submitLabel?: string
}

export function TeamForm({
  action,
  defaultValues,
  submitLabel = 'Save team member',
}: TeamFormProps) {
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Person name"
          name="full_name"
          placeholder="e.g. Joe Martinez"
          defaultValue={defaultValues?.full_name ?? ''}
          errors={errors.full_name}
        />
        <Field
          label="Company name"
          name="company_name"
          placeholder="e.g. Joe's Plumbing"
          defaultValue={defaultValues?.company_name ?? ''}
          errors={errors.company_name}
        />
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Provide a person name OR a company name (or both).
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-zinc-900">
            Role<span className="ml-0.5 text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue={defaultValues?.role ?? 'maintenance'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {TEAM_ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {TEAM_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="preferred_contact"
            className="block text-sm font-medium text-zinc-900"
          >
            Preferred contact
          </label>
          <select
            id="preferred_contact"
            name="preferred_contact"
            defaultValue={defaultValues?.preferred_contact ?? 'phone'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PREFERRED_CONTACT_VALUES.map((c) => (
              <option key={c} value={c}>
                {PREFERRED_CONTACT_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
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
      <Field
        label="Alternate phone"
        name="alt_phone"
        type="tel"
        defaultValue={defaultValues?.alt_phone ?? ''}
        errors={errors.alt_phone}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="License number"
          name="license_number"
          placeholder="For lawyers, contractors, inspectors"
          defaultValue={defaultValues?.license_number ?? ''}
          errors={errors.license_number}
        />
        <Field
          label="License state"
          name="license_state"
          placeholder="e.g. MA"
          defaultValue={defaultValues?.license_state ?? ''}
          errors={errors.license_state}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="hourly_rate"
            className="block text-sm font-medium text-zinc-900"
          >
            Hourly rate
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
              $
            </span>
            <input
              id="hourly_rate"
              name="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.hourly_rate?.toString() ?? ''}
              className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <Field
          label="Rate notes"
          name="rate_notes"
          placeholder="e.g. $85 minimum, free quotes"
          defaultValue={defaultValues?.rate_notes ?? ''}
          errors={errors.rate_notes}
        />
      </div>

      <Field
        label="Specialty"
        name="specialty"
        placeholder="e.g. 24/7 emergency, eviction specialist"
        defaultValue={defaultValues?.specialty ?? ''}
        errors={errors.specialty}
      />

      <div className="flex flex-wrap gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <Checkbox
          name="is_primary"
          label="Primary for this role"
          hint="Top of the list when picking"
          defaultChecked={defaultValues?.is_primary ?? false}
        />
        <Checkbox
          name="available_24_7"
          label="Available 24/7"
          hint="Emergency dispatch"
          defaultChecked={defaultValues?.available_24_7 ?? false}
        />
        <Checkbox
          name="is_active"
          label="Active"
          hint="Show in pickers"
          defaultChecked={defaultValues?.is_active ?? true}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="Private notes: service history, temperament, pricing quirks..."
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
  type = 'text',
  placeholder,
  defaultValue,
  errors,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  defaultValue?: string
  errors?: string[]
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
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

function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string
  label: string
  hint: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>
        <span className="block text-sm font-medium text-zinc-900">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </label>
  )
}
