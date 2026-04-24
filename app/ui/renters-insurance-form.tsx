'use client'

// ============================================================
// Renters insurance form — create or edit
// ============================================================

import { useActionState } from 'react'
import Link from 'next/link'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import type { TenantPickerRow } from '@/app/lib/queries/renters-insurance'
import type { RentersInsurancePolicy } from '@/app/lib/schemas/renters-insurance'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

export function RentersInsuranceForm({
  action,
  tenantOptions,
  existing,
  initialTenantId,
  initialLeaseId,
}: {
  action: Action
  tenantOptions: TenantPickerRow[]
  existing?: RentersInsurancePolicy
  initialTenantId?: string
  initialLeaseId?: string
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && existing !== undefined

  const resolvedTenantId = existing?.tenant_id ?? initialTenantId ?? ''
  const resolvedLeaseId =
    existing?.lease_id ??
    initialLeaseId ??
    tenantOptions.find((t) => t.id === resolvedTenantId)?.current_lease_id ??
    ''

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="tenant_id"
              className="block text-sm font-medium text-zinc-700"
            >
              Tenant
            </label>
            <select
              id="tenant_id"
              name="tenant_id"
              required
              defaultValue={resolvedTenantId}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Choose a tenant…
              </option>
              {tenantOptions.map((t) => {
                const label =
                  t.current_property_name && t.current_unit_label
                    ? `${t.first_name} ${t.last_name} (${t.current_property_name} · ${t.current_unit_label})`
                    : `${t.first_name} ${t.last_name}`
                return (
                  <option
                    key={t.id}
                    value={t.id}
                    data-lease-id={t.current_lease_id ?? ''}
                  >
                    {label}
                  </option>
                )
              })}
            </select>
            {errors.tenant_id && (
              <p className="mt-1 text-sm text-red-600">{errors.tenant_id[0]}</p>
            )}
          </div>

          {/* lease_id hidden input — defaults to the tenant's current lease */}
          <input
            type="hidden"
            name="lease_id"
            defaultValue={resolvedLeaseId}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Carrier"
              name="carrier"
              required
              placeholder="State Farm, Lemonade, Geico…"
              defaultValue={existing?.carrier}
              error={errors.carrier?.[0]}
            />
            <Field
              label="Policy number"
              name="policy_number"
              placeholder="Optional"
              defaultValue={existing?.policy_number ?? undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field
              label="Liability coverage"
              name="liability_coverage"
              type="number"
              step="1"
              prefix="$"
              placeholder="100000"
              defaultValue={existing?.liability_coverage?.toString()}
              error={errors.liability_coverage?.[0]}
            />
            <Field
              label="Personal property"
              name="personal_property_coverage"
              type="number"
              step="1"
              prefix="$"
              placeholder="25000"
              defaultValue={existing?.personal_property_coverage?.toString()}
              error={errors.personal_property_coverage?.[0]}
            />
            <Field
              label="Annual premium"
              name="annual_premium"
              type="number"
              step="0.01"
              prefix="$"
              placeholder="150.00"
              defaultValue={existing?.annual_premium?.toString()}
              error={errors.annual_premium?.[0]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Effective date"
              name="effective_date"
              type="date"
              defaultValue={existing?.effective_date ?? undefined}
              error={errors.effective_date?.[0]}
            />
            <Field
              label="Expiry date"
              name="expiry_date"
              type="date"
              required
              defaultValue={existing?.expiry_date}
              error={errors.expiry_date?.[0]}
            />
          </div>

          <Field
            label="Proof-of-insurance document URL"
            name="document_url"
            placeholder="Optional — link to a hosted PDF / image"
            defaultValue={existing?.document_url ?? undefined}
          />

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-zinc-700"
            >
              Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={existing?.notes ?? ''}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {justSaved && (
          <span className="text-sm text-emerald-600">Saved</span>
        )}
        <Link
          href="/dashboard/renters-insurance"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending
            ? 'Saving…'
            : existing
              ? 'Save changes'
              : 'Add policy'}
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
  required,
  step,
  prefix,
  defaultValue,
  error,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  step?: string
  prefix?: string
  defaultValue?: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative mt-1">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-zinc-500">
            {prefix}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          step={step}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          className={`block w-full rounded-md border border-zinc-300 bg-white ${
            prefix ? 'pl-6' : 'pl-3'
          } py-2 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
