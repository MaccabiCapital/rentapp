'use client'

// ============================================================
// Notice new form — lease + type selector drives visible fields
// ============================================================

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  NOTICE_TYPE_VALUES,
  NOTICE_TYPE_LABELS,
  NOTICE_TYPE_DESCRIPTIONS,
  ENTRY_REASONS,
  ENTRY_REASON_LABELS,
  TERMINATE_REASONS,
  TERMINATE_REASON_LABELS,
  type NoticeType,
} from '@/app/lib/schemas/notice'
import { emptyActionState, type ActionState } from '@/app/lib/types'
import type { LeasePickerRow } from '@/app/lib/queries/inspections'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

function isNoticeType(v: unknown): v is NoticeType {
  return typeof v === 'string' && (NOTICE_TYPE_VALUES as readonly string[]).includes(v)
}

export function NoticeNewForm({
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
  const [selectedType, setSelectedType] = useState<NoticeType>(
    isNoticeType(initialType) ? initialType : 'rent_increase',
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <form action={formAction} className="space-y-6">
      {/* Lease + type */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
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

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-zinc-700"
            >
              Notice type
            </label>
            <select
              id="type"
              name="type"
              required
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NoticeType)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {NOTICE_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {NOTICE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              {NOTICE_TYPE_DESCRIPTIONS[selectedType]}
            </p>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Type-specific fields */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        {selectedType === 'rent_increase' && (
          <RentIncreaseFields errors={errors} />
        )}
        {selectedType === 'entry' && <EntryFields errors={errors} />}
        {selectedType === 'late_rent' && <LateRentFields errors={errors} />}
        {selectedType === 'cure_or_quit' && (
          <CureOrQuitFields errors={errors} />
        )}
        {selectedType === 'terminate_tenancy' && (
          <TerminateFields errors={errors} />
        )}
        {selectedType === 'move_out_info' && (
          <MoveOutInfoFields errors={errors} />
        )}

        <div className="mt-4">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-zinc-700"
          >
            Internal notes <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Why are you serving this? Any context for future-you."
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Internal only — does not appear on the generated PDF.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/tenants/notices"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Generating…' : 'Generate notice'}
        </button>
      </div>
    </form>
  )
}

// ------------------------------------------------------------
// Field components per notice type
// ------------------------------------------------------------

type FieldProps = { errors: Record<string, string[] | undefined> }

function RentIncreaseFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Rent increase details
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Current monthly rent"
          name="current_monthly_rent"
          type="number"
          step="0.01"
          placeholder="2000.00"
          required
          error={errors.current_monthly_rent?.[0]}
          prefix="$"
        />
        <Field
          label="New monthly rent"
          name="new_monthly_rent"
          type="number"
          step="0.01"
          placeholder="2100.00"
          required
          error={errors.new_monthly_rent?.[0]}
          prefix="$"
        />
      </div>
      <Field
        label="Effective date"
        name="effective_date"
        type="date"
        required
        error={errors.effective_date?.[0]}
      />
      <Field
        label="Reason (optional)"
        name="reason"
        type="text"
        placeholder="Market adjustment, property improvements, etc."
      />
    </div>
  )
}

function EntryFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">Entry details</h3>
      <Field
        label="Entry date"
        name="entry_date"
        type="date"
        required
        error={errors.entry_date?.[0]}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Window starts"
          name="entry_time_start"
          type="time"
          required
          error={errors.entry_time_start?.[0]}
        />
        <Field
          label="Window ends"
          name="entry_time_end"
          type="time"
          required
          error={errors.entry_time_end?.[0]}
        />
      </div>
      <div>
        <label
          htmlFor="entry_reason"
          className="block text-sm font-medium text-zinc-700"
        >
          Reason
        </label>
        <select
          id="entry_reason"
          name="entry_reason"
          required
          defaultValue="repair"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ENTRY_REASONS.map((r) => (
            <option key={r} value={r}>
              {ENTRY_REASON_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason[0]}</p>
        )}
      </div>
      <Field
        label="Details (optional)"
        name="details"
        type="text"
        placeholder="Plumber repairing kitchen sink drain"
      />
    </div>
  )
}

function LateRentFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Late rent details
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Rent amount due"
          name="amount_due"
          type="number"
          step="0.01"
          required
          error={errors.amount_due?.[0]}
          prefix="$"
        />
        <Field
          label="Original due date"
          name="original_due_date"
          type="date"
          required
          error={errors.original_due_date?.[0]}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Late fee (optional)"
          name="late_fee"
          type="number"
          step="0.01"
          error={errors.late_fee?.[0]}
          prefix="$"
        />
        <Field
          label="Total now owed"
          name="total_owed"
          type="number"
          step="0.01"
          required
          error={errors.total_owed?.[0]}
          prefix="$"
        />
      </div>
    </div>
  )
}

function CureOrQuitFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Pay-or-quit details
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Amount due"
          name="amount_due"
          type="number"
          step="0.01"
          required
          error={errors.amount_due?.[0]}
          prefix="$"
        />
        <Field
          label="Deadline to pay"
          name="cure_deadline_date"
          type="date"
          required
          error={errors.cure_deadline_date?.[0]}
        />
      </div>
      <p className="text-xs text-zinc-500">
        Check your state&rsquo;s required cure period (often 3 to 14 days)
        before setting the deadline. The PDF will reference the state rule
        automatically if it&rsquo;s in the compliance database.
      </p>
    </div>
  )
}

function TerminateFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Termination details
      </h3>
      <Field
        label="Termination date"
        name="termination_date"
        type="date"
        required
        error={errors.termination_date?.[0]}
      />
      <div>
        <label
          htmlFor="terminate_reason"
          className="block text-sm font-medium text-zinc-700"
        >
          Reason
        </label>
        <select
          id="terminate_reason"
          name="terminate_reason"
          required
          defaultValue="non_renewal"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {TERMINATE_REASONS.map((r) => (
            <option key={r} value={r}>
              {TERMINATE_REASON_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason[0]}</p>
        )}
      </div>
      <Field
        label="Additional details (optional)"
        name="details"
        type="text"
        placeholder="e.g. 'Property going on sale' or 'Repeated lease violations'"
      />
    </div>
  )
}

function MoveOutInfoFields({ errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Move-out information
      </h3>
      <p className="text-xs text-zinc-600">
        Generates a packet you hand to the tenant covering your right to show
        the unit, move-out day procedures, the security deposit process, and
        utility transfer. The PDF fills in the tenant name, property address,
        and all fields below.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Anticipated move-out date"
          name="anticipated_move_out_date"
          type="date"
          required
          error={errors.anticipated_move_out_date?.[0]}
        />
        <Field
          label="Showing notice (hours)"
          name="showing_notice_hours"
          type="number"
          step="1"
          required
          placeholder="24"
          error={errors.showing_notice_hours?.[0]}
        />
      </div>
      <TextareaField
        label="Showings policy — how you'll coordinate access"
        name="showings_policy"
        placeholder="e.g. 'We'll text you at least [hours] ahead of any showing. Please let us know if a proposed time doesn't work and we'll reschedule.'"
      />
      <TextareaField
        label="Move-out day instructions"
        name="move_out_day_instructions"
        placeholder="e.g. 'Leave the unit broom-clean, take all trash to the curb, turn off all lights, and lock all doors. A move-out inspection will happen the day you hand in keys.'"
      />
      <TextareaField
        label="Elevator / loading dock booking"
        name="elevator_or_dock_booking"
        placeholder="e.g. 'Book the elevator with building management at least 48h ahead. Moves are allowed 8am–5pm Mon–Sat.'"
      />
      <TextareaField
        label="Keys return instructions"
        name="keys_return_instructions"
        placeholder="e.g. 'Return all keys, fobs, parking remotes, and mailroom keys to the management office on your move-out day before 5pm.'"
      />
      <TextareaField
        label="Utilities + renters insurance"
        name="utility_transfer_note"
        placeholder="e.g. 'Transfer electricity (Con Ed), gas (National Grid), and internet out of your name effective your move-out date. Cancel renters insurance after that.'"
      />
      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="forwarding_address_request"
          defaultChecked
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
        />
        Ask the tenant for a forwarding address (for security deposit return)
      </label>
    </div>
  )
}

function TextareaField({
  label,
  name,
  placeholder,
}: {
  label: string
  name: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-700">
        {label} <span className="text-zinc-400">(optional)</span>
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  )
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
  step,
  error,
  prefix,
}: {
  label: string
  name: string
  type: string
  placeholder?: string
  required?: boolean
  step?: string
  error?: string
  prefix?: string
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
          className={`block w-full rounded-md border border-zinc-300 bg-white ${
            prefix ? 'pl-6' : 'pl-3'
          } py-2 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
