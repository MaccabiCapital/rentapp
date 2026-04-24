'use client'

// ============================================================
// New leasing-conversation form
// ============================================================

import { useActionState } from 'react'
import Link from 'next/link'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import type { ProspectPickerRow } from '@/app/lib/queries/leasing'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

export function LeasingNewForm({
  action,
  prospectOptions,
}: {
  action: Action
  prospectOptions: ProspectPickerRow[]
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="prospect_id"
              className="block text-sm font-medium text-zinc-700"
            >
              Link to a prospect <span className="text-zinc-400">(optional)</span>
            </label>
            <select
              id="prospect_id"
              name="prospect_id"
              defaultValue=""
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— no prospect record, I&rsquo;ll fill in below —</option>
              {prospectOptions.map((p) => {
                const label =
                  `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
                  p.email ||
                  p.phone ||
                  '(no name)'
                return (
                  <option key={p.id} value={p.id}>
                    {label} · {p.stage}
                  </option>
                )
              })}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              If you pick a prospect, their name and contact info auto-fill.
              Otherwise, fill in the fields below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Prospect name"
              name="prospect_name"
              placeholder="Jane Prospect"
              defaultValue=""
              error={errors.prospect_name?.[0]}
            />
            <Field
              label="Contact (email or phone)"
              name="prospect_contact"
              placeholder="jane@example.com or 555-0100"
              defaultValue=""
            />
          </div>

          <div>
            <label
              htmlFor="initial_message"
              className="block text-sm font-medium text-zinc-700"
            >
              Initial prospect message{' '}
              <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="initial_message"
              name="initial_message"
              rows={5}
              placeholder="Paste what the prospect said — from Zillow inquiry, email, text, voicemail transcript, etc."
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Pasting the inbound message here seeds the conversation so the
              assistant has context for its first draft.
            </p>
          </div>

          <div>
            <label
              htmlFor="custom_system_prompt"
              className="block text-sm font-medium text-zinc-700"
            >
              Custom preferences for this conversation{' '}
              <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="custom_system_prompt"
              name="custom_system_prompt"
              rows={3}
              placeholder="e.g. 'No pets except service animals. Prefer 12-month leases. Move-in available 2026-06-01 at earliest.'"
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              These are added AFTER the built-in fair-housing rules, which
              can&rsquo;t be overridden.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/leasing-assistant"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Starting…' : 'Start conversation'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  error,
}: {
  label: string
  name: string
  placeholder?: string
  defaultValue?: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
