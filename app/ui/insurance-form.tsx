'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/lib/types'
import {
  POLICY_TYPE_LABELS,
  POLICY_TYPE_VALUES,
  type InsurancePolicyWithProperties,
} from '@/app/lib/schemas/insurance'

type PropertyOption = { id: string; name: string }
type TeamMemberOption = { id: string; display_name: string }

type InsuranceFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultValues?: InsurancePolicyWithProperties
  propertyOptions: PropertyOption[]
  teamMemberOptions: TeamMemberOption[]
  submitLabel?: string
}

export function InsuranceForm({
  action,
  defaultValues,
  propertyOptions,
  teamMemberOptions,
  submitLabel = 'Save policy',
}: InsuranceFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  const checkedPropertyIds = new Set(
    (defaultValues?.properties ?? []).map((p) => p.id),
  )

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Carrier"
          name="carrier"
          required
          placeholder="e.g. State Farm"
          defaultValue={defaultValues?.carrier ?? ''}
          errors={errors.carrier}
        />
        <Field
          label="Policy number"
          name="policy_number"
          defaultValue={defaultValues?.policy_number ?? ''}
          errors={errors.policy_number}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="policy_type"
            className="block text-sm font-medium text-zinc-900"
          >
            Policy type<span className="ml-0.5 text-red-600">*</span>
          </label>
          <select
            id="policy_type"
            name="policy_type"
            required
            defaultValue={defaultValues?.policy_type ?? 'landlord'}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {POLICY_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {POLICY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="team_member_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Insurance agent
          </label>
          <select
            id="team_member_id"
            name="team_member_id"
            defaultValue={defaultValues?.team_member_id ?? ''}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— none —</option>
            {teamMemberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Pick from your team. Add one from My Team first if missing.
          </p>
        </div>
      </div>

      <fieldset className="rounded-md border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-900">
          Properties covered
        </legend>
        {propertyOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No properties yet — add one first.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {propertyOptions.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  name="property_ids"
                  value={p.id}
                  defaultChecked={checkedPropertyIds.has(p.id)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-zinc-900">{p.name}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          A single umbrella policy can cover all properties. Per-property
          policies just check one box.
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DollarField
          label="Coverage amount"
          name="coverage_amount"
          defaultValue={defaultValues?.coverage_amount ?? null}
        />
        <DollarField
          label="Liability limit"
          name="liability_limit"
          defaultValue={defaultValues?.liability_limit ?? null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DollarField
          label="Annual premium"
          name="annual_premium"
          defaultValue={defaultValues?.annual_premium ?? null}
        />
        <DollarField
          label="Deductible"
          name="deductible"
          defaultValue={defaultValues?.deductible ?? null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          label="Effective date"
          name="effective_date"
          type="date"
          defaultValue={defaultValues?.effective_date ?? ''}
          errors={errors.effective_date}
        />
        <Field
          label="Expiry date"
          name="expiry_date"
          type="date"
          required
          defaultValue={defaultValues?.expiry_date ?? ''}
          errors={errors.expiry_date}
        />
        <Field
          label="Renewal date"
          name="renewal_date"
          type="date"
          defaultValue={defaultValues?.renewal_date ?? ''}
          errors={errors.renewal_date}
        />
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            name="auto_renewal"
            defaultChecked={defaultValues?.auto_renewal ?? false}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">
              Auto-renewal
            </span>
            <span className="block text-xs text-zinc-500">
              Carrier renews automatically. We&rsquo;ll still warn you before expiry.
            </span>
          </span>
        </label>
      </div>

      <Field
        label="Document URL"
        name="document_url"
        placeholder="Link to the declaration page PDF (Drive, Dropbox, etc.)"
        defaultValue={defaultValues?.document_url ?? ''}
        errors={errors.document_url}
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
          placeholder="Claim history, endorsements, quirks..."
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

function DollarField({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: number | null
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-900">
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-500">
          $
        </span>
        <input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValue?.toString() ?? ''}
          className="block w-full rounded-md border border-zinc-300 py-2 pl-7 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  )
}
