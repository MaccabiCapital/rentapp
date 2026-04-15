'use client'

// ============================================================
// LeaseForm — used by both the "new lease" flow from a unit and
// the "edit lease" flow from the lease detail page.
// ============================================================
//
// The new-lease variant shows a tenant picker (list + "add new
// tenant" link). The edit variant hides the picker because you
// can't reassign a lease to a different tenant.

import { useActionState } from 'react'
import Link from 'next/link'
import type { ActionState } from '@/app/lib/types'
import {
  LEASE_STATUS_LABELS,
  LEASE_STATUS_VALUES,
  type Lease,
} from '@/app/lib/schemas/lease'

type TenantOption = {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

type LeaseFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  tenantOptions?: TenantOption[]
  defaultValues?: Lease
  submitLabel?: string
  mode: 'create' | 'edit'
}

export function LeaseForm({
  action,
  tenantOptions,
  defaultValues,
  submitLabel = 'Save lease',
  mode,
}: LeaseFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null

  // Edit mode can't change status away from certain final states
  // in this form alone — but we still render the select for
  // completeness. The server action enforces transitions.
  const availableStatuses: typeof LEASE_STATUS_VALUES =
    mode === 'create'
      ? (['draft', 'active'] as unknown as typeof LEASE_STATUS_VALUES)
      : LEASE_STATUS_VALUES

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      {mode === 'create' && tenantOptions && (
        <div>
          <label
            htmlFor="tenant_id"
            className="block text-sm font-medium text-zinc-900"
          >
            Tenant<span className="ml-0.5 text-red-600">*</span>
          </label>
          {tenantOptions.length === 0 ? (
            <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You don&rsquo;t have any tenants yet.{' '}
              <Link
                href="/dashboard/tenants/new"
                className="font-medium underline"
              >
                Add a tenant
              </Link>{' '}
              first, then come back here to create the lease.
            </div>
          ) : (
            <>
              <select
                id="tenant_id"
                name="tenant_id"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— pick a tenant —</option>
                {tenantOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.last_name}, {t.first_name}
                    {t.email ? ` (${t.email})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Not listed?{' '}
                <Link
                  href="/dashboard/tenants/new"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Add a new tenant
                </Link>
                , then refresh this page.
              </p>
            </>
          )}
          {errors.tenant_id && (
            <p className="mt-1 text-sm text-red-600">
              {errors.tenant_id.join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Start date"
          name="start_date"
          type="date"
          required
          defaultValue={defaultValues?.start_date ?? ''}
          errors={errors.start_date}
        />
        <Field
          label="End date"
          name="end_date"
          type="date"
          required
          defaultValue={defaultValues?.end_date ?? ''}
          errors={errors.end_date}
        />
      </div>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          label="Rent due day"
          name="rent_due_day"
          type="number"
          min="1"
          max="31"
          defaultValue={defaultValues?.rent_due_day?.toString() ?? '1'}
          errors={errors.rent_due_day}
        />
        <CurrencyField
          label="Late fee"
          name="late_fee_amount"
          defaultValue={defaultValues?.late_fee_amount?.toString() ?? ''}
          errors={errors.late_fee_amount}
        />
        <Field
          label="Grace days"
          name="late_fee_grace_days"
          type="number"
          min="0"
          max="30"
          defaultValue={defaultValues?.late_fee_grace_days?.toString() ?? '5'}
          errors={errors.late_fee_grace_days}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-zinc-900">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? 'draft'}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {availableStatuses.map((s) => (
            <option key={s} value={s}>
              {LEASE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Active leases mark the unit as Occupied automatically.
        </p>
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
          disabled={isPending || (mode === 'create' && tenantOptions && tenantOptions.length === 0)}
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
  max,
  defaultValue,
  errors,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  min?: string
  max?: string
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
        min={min}
        max={max}
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
      {props.errors && props.errors.length > 0 && (
        <p className="mt-1 text-sm text-red-600">{props.errors.join(' ')}</p>
      )}
    </div>
  )
}
