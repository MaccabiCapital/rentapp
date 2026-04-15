'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import type { Tenant } from '@/app/lib/schemas/tenant'

type TenantFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Tenant
  submitLabel?: string
}

export function TenantForm({
  action,
  defaultValues,
  submitLabel = 'Save tenant',
}: TenantFormProps) {
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
          label="First name"
          name="first_name"
          required
          defaultValue={defaultValues?.first_name}
          errors={errors.first_name}
        />
        <Field
          label="Last name"
          name="last_name"
          required
          defaultValue={defaultValues?.last_name}
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

      <Field
        label="Date of birth"
        name="date_of_birth"
        type="date"
        defaultValue={defaultValues?.date_of_birth ?? ''}
        errors={errors.date_of_birth}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Emergency contact name"
          name="emergency_contact_name"
          defaultValue={defaultValues?.emergency_contact_name ?? ''}
          errors={errors.emergency_contact_name}
        />
        <Field
          label="Emergency contact phone"
          name="emergency_contact_phone"
          type="tel"
          defaultValue={defaultValues?.emergency_contact_phone ?? ''}
          errors={errors.emergency_contact_phone}
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
