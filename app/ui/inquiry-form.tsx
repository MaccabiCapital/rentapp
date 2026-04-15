'use client'

// ============================================================
// InquiryForm — public-facing contact form for listings
// ============================================================
//
// Submits to the submitInquiry server action, which does:
//   1. Zod validation
//   2. Honeypot check (the "website" field)
//   3. Turnstile verification (server-side)
//   4. Slug → listing lookup via service role
//   5. Insert a prospect row on the landlord's behalf

import { useActionState } from 'react'
import { submitInquiry } from '@/app/actions/listings'
import { TurnstileWidget } from './turnstile-widget'
import type { ActionState } from '@/app/lib/types'

export function InquiryForm({
  slug,
  turnstileSiteKey,
}: {
  slug: string
  turnstileSiteKey: string
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    submitInquiry,
    { success: true },
  )

  const errors = state && !state.success && 'errors' in state ? state.errors : {}
  const formMessage =
    state && !state.success && 'message' in state ? state.message : null
  const succeeded = state && state.success && state !== undefined

  // Only show success after a real submission (not the initial empty state)
  const isInitial = state && state.success && Object.keys(state).length === 1

  if (succeeded && !isInitial) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
        <svg
          className="mx-auto h-10 w-10 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-3 text-base font-semibold text-emerald-900">
          Message sent!
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          The landlord will be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      {/* Honeypot — hidden from humans, bots fill it in */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="website">Website (leave blank)</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {formMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          name="first_name"
          required
          autoComplete="given-name"
          errors={errors.first_name}
        />
        <Field
          label="Last name"
          name="last_name"
          autoComplete="family-name"
          errors={errors.last_name}
        />
      </div>

      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        errors={errors.email}
      />

      <Field
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        errors={errors.phone}
      />

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-zinc-900"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Tell the landlord a bit about yourself, move-in date, pets, etc."
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {turnstileSiteKey && (
        <div className="py-1">
          <TurnstileWidget siteKey={turnstileSiteKey} />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send inquiry'}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Your message goes directly to the landlord. No spam, ever.
      </p>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
  autoComplete,
  errors,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  autoComplete?: string
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
        autoComplete={autoComplete}
        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {errors && errors.length > 0 && (
        <p className="mt-1 text-xs text-red-600">{errors.join(' ')}</p>
      )}
    </div>
  )
}
