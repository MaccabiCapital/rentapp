'use client'

// ============================================================
// Criteria form (create + edit)
// ============================================================
//
// Single-page form. The 6-step wizard from the spec is deferred —
// most of the value comes from the form fields themselves, not the
// step-by-step UX.

import { useActionState } from 'react'
import Link from 'next/link'
import { createCriteria, updateCriteria } from '@/app/actions/compliance'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import { SUPPORTED_JURISDICTIONS } from '@/app/lib/compliance/rules'
import type { TenantSelectionCriteria } from '@/app/lib/schemas/compliance'

const JURISDICTION_OPTIONS: Array<{ code: string; name: string }> = [
  { code: 'US', name: 'Federal only (US)' },
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'MI', name: 'Michigan' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'WA', name: 'Washington' },
].filter((o) => SUPPORTED_JURISDICTIONS.includes(o.code))

export function CriteriaForm({
  existing,
}: {
  existing?: TenantSelectionCriteria
}) {
  const action = existing
    ? updateCriteria.bind(null, existing.id)
    : (createCriteria as (
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

  return (
    <form action={formAction} className="space-y-6">
      {/* Basics */}
      <Section title="Basics">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Name"
            name="name"
            required
            placeholder="e.g., Default criteria — Detroit portfolio"
            defaultValue={existing?.name ?? ''}
            error={errors.name?.[0]}
          />
          <div>
            <label
              htmlFor="jurisdiction"
              className="block text-xs font-medium text-zinc-700"
            >
              Jurisdiction
              <span className="text-red-500"> *</span>
            </label>
            <select
              id="jurisdiction"
              name="jurisdiction"
              required
              defaultValue={existing?.jurisdiction ?? 'US'}
              disabled={!!existing}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-100"
            >
              {JURISDICTION_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
            {errors.jurisdiction && (
              <p className="mt-1 text-xs text-red-600">
                {errors.jurisdiction[0]}
              </p>
            )}
            {existing && (
              <p className="mt-1 text-xs text-zinc-500">
                Jurisdiction is locked once saved.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Income + credit */}
      <Section title="Income &amp; credit">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Income multiple (e.g., 3.0 for 3x rent)"
            name="income_multiple"
            type="number"
            step="0.1"
            defaultValue={existing?.income_multiple?.toString() ?? '3.0'}
            error={errors.income_multiple?.[0]}
          />
          <Field
            label="Minimum credit score"
            name="min_credit_score"
            type="number"
            step="1"
            defaultValue={existing?.min_credit_score?.toString() ?? ''}
            placeholder="e.g., 620"
            error={errors.min_credit_score?.[0]}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Checkbox
            label="Accept Section 8 / housing vouchers"
            name="accepts_section_8"
            defaultChecked={existing?.accepts_section_8 ?? true}
          />
          <Checkbox
            label="Accept other vouchers / public assistance"
            name="accepts_other_vouchers"
            defaultChecked={existing?.accepts_other_vouchers ?? true}
          />
        </div>
        <p className="text-xs text-zinc-500">
          In jurisdictions that protect source of income (CA, NY, WA, +
          local cities including Ann Arbor / East Lansing / Lansing in MI),
          voucher acceptance is required by law. We default both to{' '}
          <strong>accept</strong> — leave them on unless you have a specific
          legal reason.
        </p>
      </Section>

      {/* History */}
      <Section title="Rental + criminal history">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Eviction lookback (years)"
            name="max_evictions_lookback_years"
            type="number"
            step="1"
            defaultValue={
              existing?.max_evictions_lookback_years?.toString() ?? '7'
            }
          />
          <Field
            label="Maximum prior evictions"
            name="max_eviction_count"
            type="number"
            step="1"
            defaultValue={existing?.max_eviction_count?.toString() ?? '0'}
          />
          <Field
            label="Criminal history lookback (years)"
            name="criminal_history_lookback_years"
            type="number"
            step="1"
            defaultValue={
              existing?.criminal_history_lookback_years?.toString() ?? '7'
            }
          />
        </div>
        <p className="text-xs text-zinc-500">
          Criminal history is considered case-by-case after a conditional
          offer, with individualized assessment. In CA / NYC / Detroit /
          Ann Arbor (and other ban-the-box jurisdictions), blanket
          criminal-history exclusions are illegal — leave the lookback short
          and document each individualized assessment.
        </p>
      </Section>

      {/* Pets + occupancy */}
      <Section title="Pets &amp; occupancy">
        <Field
          label="Pet policy"
          name="pet_policy"
          defaultValue={existing?.pet_policy ?? ''}
          placeholder="e.g., 'No pets — service animals and ESAs welcome with documentation'"
        />
        <Field
          label="Occupancy max per bedroom (HUD baseline = 2)"
          name="occupancy_max_per_bedroom"
          type="number"
          step="1"
          defaultValue={existing?.occupancy_max_per_bedroom?.toString() ?? '2'}
        />
      </Section>

      {/* Free-text */}
      <Section title="Additional requirements + accommodations">
        <Textarea
          label="Additional requirements (will be in the PDF)"
          name="additional_requirements"
          defaultValue={existing?.additional_requirements ?? ''}
          placeholder="Anything else you require of every applicant. Avoid demographic targeting; describe objective requirements only."
        />
        <Textarea
          label="Reasonable accommodations statement"
          name="reasonable_accommodations_statement"
          defaultValue={existing?.reasonable_accommodations_statement ?? ''}
          placeholder="Default text is auto-generated if blank. Override here if your attorney has provided custom language."
          rows={4}
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
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={
              existing
                ? `/dashboard/compliance/criteria/${existing.id}`
                : '/dashboard/compliance/criteria'
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
            {isPending
              ? existing
                ? 'Saving…'
                : 'Creating…'
              : existing
                ? 'Save changes'
                : 'Create criteria'}
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
  step,
  required,
  placeholder,
  defaultValue,
  error,
}: {
  label: string
  name: string
  type?: string
  step?: string
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
        type={type}
        id={name}
        name={name}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
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

function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string
  name: string
  defaultChecked?: boolean | null
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked ?? false}
        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  )
}
