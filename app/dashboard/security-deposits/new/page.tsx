// ============================================================
// Dashboard → Security deposits → new
// ============================================================
//
// Lease picker. Submitting creates the settlement, snapshots the
// deposit, copies the tenant forwarding address, looks up the
// state's return-days, auto-suggests damage deductions from the
// move-in vs move-out inspection comparison, then redirects to
// the detail page for review and edit.

import Link from 'next/link'
import {
  getLeasesForSettlementPicker,
  type LeasePickerRow,
} from '@/app/lib/queries/security-deposits'
import { SettlementCreateForm } from '@/app/ui/settlement-create-form'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function NewSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ leaseId?: string }>
}) {
  const { leaseId } = await searchParams
  const allLeases = await getLeasesForSettlementPicker()

  // Don't offer leases that already have a non-deleted settlement
  const eligible = allLeases.filter((l) => !l.has_settlement)
  const alreadyHas = allLeases.filter((l) => l.has_settlement)

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/security-deposits"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All deposit settlements
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Generate deposit accounting
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pick the lease for the tenant who moved out. We&rsquo;ll snapshot the
          deposit, copy the forwarding address (if you captured it), pre-fill
          damage deductions from the move-out inspection, and start a draft
          letter you can edit.
        </p>
      </div>

      {eligible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No leases ready for settlement
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Every active or recent lease either already has a settlement, or
            none have been created yet. Generating a deposit accounting letter
            requires an existing lease record with a deposit on file.
          </p>
        </div>
      ) : (
        <SettlementCreateForm
          leases={eligible}
          defaultLeaseId={leaseId}
          formatDate={formatDate}
          formatMoney={formatMoney}
        />
      )}

      {alreadyHas.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-700">
            Leases that already have a settlement
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            {alreadyHas.map((l: LeasePickerRow) => (
              <li key={l.id}>
                <Link
                  href={`/dashboard/security-deposits?leaseId=${l.id}`}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {l.tenant_name} · {l.property_name}
                  {l.unit_number ? ` · ${l.unit_number}` : ''}
                </Link>{' '}
                <span className="text-zinc-400">
                  · ended {formatDate(l.end_date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
