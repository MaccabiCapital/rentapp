'use client'

import { useActionState } from 'react'
import { updateCompanyProfile } from '@/app/actions/company-profile'
import { emptyActionState } from '@/app/lib/types'
import type { CompanyProfile } from '@/app/lib/schemas/company-profile'

export function CompanyProfileForm({
  existing,
}: {
  existing: CompanyProfile | null
}) {
  const [state, formAction, isPending] = useActionState(
    updateCompanyProfile,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  return (
    <form action={formAction} className="space-y-6">
      {/* Branding */}
      <Section title="Business identity">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Company / business name"
            name="company_name"
            placeholder="e.g., Smelyansky Properties LLC"
            defaultValue={existing?.company_name ?? ''}
          />
          <Field
            label="Website"
            name="website"
            type="url"
            placeholder="https://"
            defaultValue={existing?.website ?? ''}
          />
          <Field
            label="Brand color (hex, used for future PDF + dashboard theming)"
            name="brand_color"
            placeholder="#4f46e5"
            defaultValue={existing?.brand_color ?? ''}
            error={errors.brand_color?.[0]}
          />
        </div>
      </Section>

      {/* Contact */}
      <Section title="Business contact">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Business email"
            name="business_email"
            type="email"
            placeholder="hello@yourcompany.com"
            defaultValue={existing?.business_email ?? ''}
          />
          <Field
            label="Business phone"
            name="business_phone"
            type="tel"
            placeholder="(555) 123-4567"
            defaultValue={existing?.business_phone ?? ''}
          />
        </div>
        <Field
          label="Mailing street address"
          name="business_street_address"
          placeholder="123 Main St"
          defaultValue={existing?.business_street_address ?? ''}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field
            label="Suite / unit"
            name="business_unit"
            placeholder="Suite 200"
            defaultValue={existing?.business_unit ?? ''}
          />
          <Field
            label="City"
            name="business_city"
            defaultValue={existing?.business_city ?? ''}
          />
          <Field
            label="State"
            name="business_state"
            placeholder="MI"
            defaultValue={existing?.business_state ?? ''}
            uppercase
          />
          <Field
            label="ZIP"
            name="business_postal_code"
            defaultValue={existing?.business_postal_code ?? ''}
          />
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Default policies (used as starting values for new leases)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Default notice period (days)"
            name="default_notice_period_days"
            type="number"
            step="1"
            placeholder="e.g., 30"
            defaultValue={existing?.default_notice_period_days?.toString() ?? ''}
            error={errors.default_notice_period_days?.[0]}
          />
          <Field
            label="Default late fee amount"
            name="default_late_fee_amount"
            type="number"
            step="0.01"
            prefix="$"
            placeholder="e.g., 50"
            defaultValue={existing?.default_late_fee_amount?.toString() ?? ''}
            error={errors.default_late_fee_amount?.[0]}
          />
          <Field
            label="Default grace period (days past due)"
            name="default_grace_period_days"
            type="number"
            step="1"
            placeholder="e.g., 5"
            defaultValue={existing?.default_grace_period_days?.toString() ?? ''}
            error={errors.default_grace_period_days?.[0]}
          />
        </div>
        <Textarea
          label="Default pet policy"
          name="default_pet_policy"
          rows={2}
          defaultValue={existing?.default_pet_policy ?? ''}
          placeholder="e.g., 'No pets — service animals and ESAs welcome with documentation. Pet rent +$50/mo, pet deposit +$300 if approved.'"
        />
      </Section>

      {/* House rules */}
      <Section title="House rules &amp; emergency info">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Business hours (for tenant communication)"
            name="business_hours"
            placeholder="Mon–Fri 9am–5pm ET"
            defaultValue={existing?.business_hours ?? ''}
          />
          <Field
            label="Quiet hours (for the lease + welcome packet)"
            name="quiet_hours"
            placeholder="10pm–7am"
            defaultValue={existing?.quiet_hours ?? ''}
          />
        </div>
        <Field
          label="Emergency contact (24/7 — for urgent maintenance, etc.)"
          name="emergency_contact"
          placeholder="(555) 999-9999 — Joe in maintenance"
          defaultValue={existing?.emergency_contact ?? ''}
        />
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
        <button
          type="submit"
          disabled={isPending}
          className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
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
  step,
  placeholder,
  defaultValue,
  prefix,
  uppercase,
  error,
}: {
  label: string
  name: string
  type?: string
  step?: string
  placeholder?: string
  defaultValue?: string
  prefix?: string
  uppercase?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700">
        {label}
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
          defaultValue={defaultValue}
          maxLength={uppercase ? 2 : undefined}
          className={`block w-full rounded-md border border-zinc-300 bg-white ${
            prefix ? 'pl-6' : 'pl-3'
          } py-2 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${uppercase ? 'uppercase' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Textarea({
  label,
  name,
  rows = 3,
  placeholder,
  defaultValue,
}: {
  label: string
  name: string
  rows?: number
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  )
}
