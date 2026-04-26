// ============================================================
// Dashboard → Security deposits → list page
// ============================================================
//
// All move-out deposit accounting letters, newest first. Status
// flow: draft → finalized → mailed. Late or unmailed-past-deadline
// rows carry a red flag.

import Link from 'next/link'
import { listSettlements } from '@/app/lib/queries/security-deposits'
import {
  SETTLEMENT_STATUS_LABELS,
  STATUS_BADGE,
  formatMoney,
} from '@/app/lib/schemas/security-deposit'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false
  const today = new Date().toISOString().slice(0, 10)
  return deadline < today
}

export default async function SecurityDepositsPage() {
  const rows = await listSettlements()

  const empty = (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
      <h3 className="text-lg font-semibold text-zinc-900">
        No deposit accounting letters yet
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        When a tenant moves out, generate the itemized security-deposit
        accounting letter. Damage deductions are pre-filled from the move-in
        vs move-out inspection comparison; you fill in the dollar amounts and
        any other deductions.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/security-deposits/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Generate your first letter
        </Link>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Security deposits
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Itemized move-out accounting letters with state-specific deadlines.
          </p>
        </div>
        <Link
          href="/dashboard/security-deposits/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Generate letter
        </Link>
      </div>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">DRAFT — review before mailing</div>
        <p className="mt-1 text-amber-800">
          State law dictates the deadline, mailing method, and required
          contents of the deposit accounting letter. Use this generator as a
          starting point and review with an attorney licensed in the
          property&rsquo;s state before mailing. Rentapp is not a law firm.
        </p>
      </div>

      {rows.length === 0 ? (
        empty
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Status</Th>
                <Th>Property / unit / tenant</Th>
                <Th>Original deposit</Th>
                <Th>Deductions</Th>
                <Th>Refund / owed</Th>
                <Th>Deadline</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((r) => {
                const tenantName = r.lease?.tenant
                  ? `${r.lease.tenant.first_name} ${r.lease.tenant.last_name}`.trim()
                  : 'Unknown tenant'
                const unitLabel = r.lease?.unit?.unit_number ?? 'Unit'
                const propertyName =
                  r.lease?.unit?.property?.name ?? 'Unknown property'
                const overdue =
                  r.status !== 'mailed' && isPastDeadline(r.legal_deadline_date)

                return (
                  <tr key={r.id} className="even:bg-zinc-50/40">
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                      >
                        {SETTLEMENT_STATUS_LABELS[r.status]}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/security-deposits/${r.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {propertyName} · {unitLabel}
                      </Link>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {tenantName}
                      </div>
                    </Td>
                    <Td>{formatMoney(r.original_deposit)}</Td>
                    <Td>{formatMoney(r.totalDeductions)}</Td>
                    <Td>
                      {r.net >= 0 ? (
                        <span className="text-emerald-700">
                          Refund {formatMoney(r.net)}
                        </span>
                      ) : (
                        <span className="text-red-700">
                          Owed {formatMoney(Math.abs(r.net))}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="text-sm">
                        {formatDate(r.legal_deadline_date)}
                      </div>
                      {overdue && (
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          PAST DEADLINE
                        </span>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}
