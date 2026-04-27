'use client'

// ============================================================
// New-inspection form
// ============================================================
//
// Minimal form: pick a lease, pick a type, optional scheduled
// date and notes. On submit, the server action seeds a starter
// checklist and redirects to the detail page.

import { useActionState } from 'react'
import Link from 'next/link'
import {
  INSPECTION_TYPE_VALUES,
  INSPECTION_TYPE_LABELS,
  type InspectionType,
} from '@/app/lib/schemas/inspection'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import type { LeasePickerRow } from '@/app/lib/queries/inspections'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

function isInspectionType(v: unknown): v is InspectionType {
  return (
    typeof v === 'string' &&
    (INSPECTION_TYPE_VALUES as readonly string[]).includes(v)
  )
}

export function InspectionNewForm({
  action,
  leaseOptions,
  initialLeaseId,
  initialType,
}: {
  action: Action
  leaseOptions: LeasePickerRow[]
  initialLeaseId?: string
  initialType?: string
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  const resolvedInitialType: InspectionType = isInspectionType(initialType)
    ? initialType
    : 'move_in'

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {/* Lease */}
          <div>
            <label
              htmlFor="lease_id"
              className="block text-sm font-medium text-zinc-700"
            >
              Lease
            </label>
            <select
              id="lease_id"
              name="lease_id"
              required
              defaultValue={initialLeaseId ?? ''}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Choose a lease…
              </option>
              {leaseOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.property_name} · {l.unit_label} · {l.tenant_name} ({l.status})
                </option>
              ))}
            </select>
            {errors.lease_id && (
              <p className="mt-1 text-sm text-red-600">{errors.lease_id[0]}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-zinc-700"
            >
              Inspection type
            </label>
            <select
              id="type"
              name="type"
              required
              defaultValue={resolvedInitialType}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {INSPECTION_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {INSPECTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type[0]}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              Move-in documents condition the day keys are handed over. Move-out
              is the matching walkthrough when the tenant leaves. Periodic is
              for annual or post-repair walkthroughs.
            </p>
          </div>

          {/* Scheduled for */}
          <div>
            <label
              htmlFor="scheduled_for"
              className="block text-sm font-medium text-zinc-700"
            >
              Scheduled date <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="date"
              id="scheduled_for"
              name="scheduled_for"
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.scheduled_for && (
              <p className="mt-1 text-sm text-red-600">
                {errors.scheduled_for[0]}
              </p>
            )}
          </div>

          {/* Notes */}
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
              rows={3}
              placeholder="Anything context-relevant about this inspection…"
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
        <Link
          href="/dashboard/properties/inspections"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Creating…' : 'Create inspection'}
        </button>
      </div>
    </form>
  )
}
