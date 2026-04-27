'use client'

// ============================================================
// New-settlement form (lease picker)
// ============================================================
//
// Pick a lease, submit. The server action snapshots deposit, copies
// forwarding address, looks up the state's deadline days, pre-fills
// damage deductions from the move-in vs move-out comparison, and
// redirects to the detail page.

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createSettlement } from '@/app/actions/security-deposits'
import { emptyActionState } from '@/app/lib/types'
import type { LeasePickerRow } from '@/app/lib/queries/security-deposits'

export function SettlementCreateForm({
  leases,
  defaultLeaseId,
  formatDate,
  formatMoney,
}: {
  leases: LeasePickerRow[]
  defaultLeaseId?: string
  formatDate: (iso: string | null) => string
  formatMoney: (value: number | null) => string
}) {
  const [state, formAction, isPending] = useActionState(
    createSettlement,
    emptyActionState,
  )
  const [selectedId, setSelectedId] = useState<string>(
    defaultLeaseId &&
      leases.some((l) => l.id === defaultLeaseId)
      ? defaultLeaseId
      : '',
  )

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  const selected = leases.find((l) => l.id === selectedId) ?? null

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
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
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="" disabled>
              Choose a lease…
            </option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {l.tenant_name} · {l.property_name}
                {l.unit_number ? ` · ${l.unit_number}` : ''} · ended{' '}
                {formatDate(l.end_date)}
              </option>
            ))}
          </select>
          {errors.lease_id && (
            <p className="mt-1 text-sm text-red-600">{errors.lease_id[0]}</p>
          )}
        </div>

        {selected && (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="font-medium text-zinc-900">
              {selected.tenant_name}
            </div>
            <div className="mt-1 text-zinc-600">
              {selected.property_name}
              {selected.unit_number ? ` · ${selected.unit_number}` : ''}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-zinc-500">Deposit on file</div>
                <div className="mt-0.5 font-semibold text-zinc-900">
                  {formatMoney(selected.security_deposit)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Lease ended</div>
                <div className="mt-0.5 font-semibold text-zinc-900">
                  {formatDate(selected.end_date)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Status</div>
                <div className="mt-0.5 font-semibold text-zinc-900">
                  {selected.status}
                </div>
              </div>
            </div>
            {selected.security_deposit === null ||
            selected.security_deposit === 0 ? (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                This lease has no deposit recorded. You can still generate a
                letter, but the original-deposit field will start at $0 — set
                it on the lease first if that&rsquo;s wrong.
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="font-semibold">What happens next</div>
        <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
          <li>We snapshot the deposit amount onto the settlement.</li>
          <li>
            If you&rsquo;ve captured the tenant&rsquo;s forwarding address,
            we copy it onto the letter (you can still edit).
          </li>
          <li>
            We pre-fill damage deductions from the move-in vs move-out
            inspection comparison &mdash; one suggested deduction per worsened
            item, with photos attached.
          </li>
          <li>
            We look up the state&rsquo;s legal return-days deadline so you
            know when this letter must be postmarked.
          </li>
          <li>
            You review and edit on the next page. Nothing is sent to the
            tenant until you mark it mailed.
          </li>
        </ul>
      </div>

      {message && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/tenants/security-deposits"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || !selectedId}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Generating…' : 'Generate draft letter'}
        </button>
      </div>
    </form>
  )
}
