'use client'

// ============================================================
// Public application form — embedded in /apply/[slug]
// ============================================================

import { useActionState } from 'react'
import Link from 'next/link'
import { submitApplication } from '@/app/actions/public-application'
import type { PublicApplicationResult } from '@/app/actions/public-application'

const INITIAL_STATE: PublicApplicationResult = {
  success: false,
  message: '',
}

export function ApplicationForm({
  slug,
  petPolicy,
}: {
  slug: string
  petPolicy?: string | null
}) {
  const [state, formAction, isPending] = useActionState<
    PublicApplicationResult,
    FormData
  >(submitApplication, INITIAL_STATE)

  if (state.success) {
    const docs =
      'documentsUploaded' in state ? state.documentsUploaded : 0
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="text-3xl">🎉</div>
        <h2 className="mt-3 text-lg font-semibold text-emerald-900">
          Application submitted
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Thanks — the landlord will review your application and reach out
          within 1–3 business days. Keep an eye on your email and phone.
        </p>
        {docs > 0 && (
          <p className="mt-2 text-xs text-emerald-700">
            {docs} document{docs === 1 ? '' : 's'} uploaded with your application.
          </p>
        )}
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          Back to listings
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      <Section title="About you">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="First name" name="first_name" required />
          <Field label="Last name" name="last_name" required />
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
        </div>
      </Section>

      <Section title="Your move">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Desired move-in date"
            name="desired_move_in"
            type="date"
          />
          <Field
            label="Household size"
            name="household_size"
            type="number"
            step="1"
            placeholder="Number of people living in the unit"
          />
        </div>
        <Field
          label="Do you have pets? If yes, type / size"
          name="has_pets"
          placeholder="e.g. '1 dog, 40lb, well-trained' or leave blank for no pets"
        />
        {petPolicy && (
          <p className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
            <strong>Landlord&rsquo;s pet policy: </strong>
            {petPolicy}
          </p>
        )}
      </Section>

      <Section title="Income + employment">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Employer" name="employer" />
          <Field
            label="Employment type"
            name="employment_type"
            placeholder="e.g. Full-time, self-employed, retired"
          />
          <Field
            label="Monthly income (approximate)"
            name="monthly_income"
            type="number"
            step="100"
            prefix="$"
          />
        </div>
        <p className="text-xs text-zinc-500">
          All legal sources of income count — W-2, 1099, Social Security,
          disability, vouchers, retirement, etc. Ask the helper on the right
          if you&rsquo;re unsure.
        </p>
      </Section>

      <Section title="Rental history">
        <Field
          label="Previous / current address"
          name="previous_address"
          placeholder="Street, city, state"
        />
        <Field
          label="Reason for moving"
          name="reason_for_moving"
          placeholder="e.g. Closer to work, lease ending, relocating"
        />
      </Section>

      <Section title="Supporting documents (optional)">
        <p className="text-xs text-zinc-600">
          Upload anything that helps verify your application. Common: a
          recent pay stub, the last 1-2 months of bank statements, an
          employer letter, and a photo ID. PDFs or images, up to 10 MB
          each. All optional — you can skip any field.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FileField label="Most recent pay stub" name="document_pay_stub" />
          <FileField
            label="Bank statement"
            name="document_bank_statement"
          />
          <FileField
            label="Employment / offer letter"
            name="document_employment_letter"
          />
          <FileField label="Photo ID" name="document_photo_id" />
          <FileField
            label="Most recent tax return (if self-employed)"
            name="document_tax_return"
          />
          <FileField label="Reference letter" name="document_reference_letter" />
        </div>
      </Section>

      <Section title="Anything else to share?">
        <textarea
          name="additional_notes"
          rows={3}
          placeholder="Optional — use this to explain anything on your application, ask a question, or share context (past credit issues, roommates, pets, etc.)"
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </Section>

      {!state.success && 'message' in state && state.message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {state.message}
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="font-semibold">Fair-housing notice</div>
        <p className="mt-1 text-amber-800">
          The landlord will evaluate your application based on legally-allowed
          criteria only (income, credit history, rental references, etc.) and
          will NOT discriminate based on race, color, religion, sex, national
          origin, disability, familial status, or any other protected
          characteristic. Submitting this application does not guarantee
          approval; you&rsquo;ll hear back from the landlord directly.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Submitting…' : 'Submit application'}
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
      />
    </div>
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
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  step?: string
  prefix?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-zinc-700">
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
          className={`block w-full rounded-md border border-zinc-300 bg-white ${
            prefix ? 'pl-6' : 'pl-3'
          } py-2 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
        />
      </div>
    </div>
  )
}
