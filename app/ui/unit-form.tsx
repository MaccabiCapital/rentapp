'use client'

// ============================================================
// UnitForm — used by both /units/new and /units/[id]/edit
// ============================================================

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  UNIT_STATUS_LABELS,
  UNIT_STATUS_VALUES,
  type Unit,
} from '@/app/lib/schemas/unit'

type UnitFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: Unit
  submitLabel?: string
}

export function UnitForm({
  action,
  defaultValues,
  submitLabel = 'Save unit',
}: UnitFormProps) {
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
        label="Unit number"
        name="unit_number"
        placeholder="e.g. 1A, 2B"
        defaultValue={defaultValues?.unit_number ?? ''}
        errors={errors.unit_number}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Bedrooms"
          name="bedrooms"
          type="number"
          min="0"
          defaultValue={defaultValues?.bedrooms?.toString() ?? ''}
          errors={errors.bedrooms}
        />
        <Field
          label="Bathrooms"
          name="bathrooms"
          type="number"
          step="0.5"
          min="0"
          defaultValue={defaultValues?.bathrooms?.toString() ?? ''}
          errors={errors.bathrooms}
        />
      </div>

      <Field
        label="Square feet"
        name="square_feet"
        type="number"
        min="0"
        defaultValue={defaultValues?.square_feet?.toString() ?? ''}
        errors={errors.square_feet}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CurrencyField
          label="Monthly rent"
          name="monthly_rent"
          required
          defaultValue={defaultValues?.monthly_rent?.toString() ?? ''}
          errors={errors.monthly_rent}
        />
        <CurrencyField
          label="Security deposit"
          name="security_deposit"
          defaultValue={defaultValues?.security_deposit?.toString() ?? ''}
          errors={errors.security_deposit}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-zinc-900">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? 'vacant'}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {UNIT_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {UNIT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <FieldErrors errors={errors.status} />
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
  min,
  step,
  defaultValue,
  placeholder,
  errors,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  min?: string
  step?: string
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
        min={min}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <FieldErrors errors={errors} />
    </div>
  )
}

function CurrencyField(props: {
  label: string
  name: string
  required?: boolean
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
        {props.required && <span className="ml-0.5 text-red-600">*</span>}
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
          required={props.required}
          defaultValue={props.defaultValue}
          className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <FieldErrors errors={props.errors} />
    </div>
  )
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="mt-1 text-sm text-red-600">{errors.join(' ')}</p>
}
