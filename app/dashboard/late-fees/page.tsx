// ============================================================
// Dashboard → Late fees → list page
// ============================================================
//
// All applied late fees, plus a summary card showing pending /
// paid / waived totals and the timestamp of the last auto-scan.
//
// "Run scan now" button manually fires the scanner against the
// current landlord's leases — useful for testing and for landlords
// who want fees applied immediately rather than waiting for the
// daily 9am UTC cron.

import Link from 'next/link'
import {
  listLateFees,
  getLateFeeSummary,
} from '@/app/lib/queries/late-fees'
import {
  LATE_FEE_STATUS_LABELS,
  LATE_FEE_STATUS_BADGE,
  LATE_FEE_SOURCE_LABELS,
  formatMoney,
} from '@/app/lib/schemas/late-fee'
import { LateFeeWaiveButton } from '@/app/ui/late-fee-waive-button'
import { LateFeeMarkPaidButton } from '@/app/ui/late-fee-mark-paid-button'
import { LateFeeRunScanButton } from '@/app/ui/late-fee-run-scan-button'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(
    iso + (iso.length === 10 ? 'T00:00:00Z' : ''),
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const ms = new Date(iso).getTime()
  const diffMin = Math.floor((Date.now() - ms) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

export default async function LateFeesPage() {
  const [rows, summary] = await Promise.all([
    listLateFees(),
    getLateFeeSummary(),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Late fees</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Applied automatically each day for leases that have a late fee
            configured and a grace period exceeded.
          </p>
        </div>
        <LateFeeRunScanButton />
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Pending"
          value={formatMoney(summary.pendingAmount)}
          sub={`${summary.pendingCount} owed`}
          tone="amber"
        />
        <SummaryCard
          label="Paid"
          value={formatMoney(summary.paidAmount)}
          sub={`${summary.paidCount} collected`}
          tone="emerald"
        />
        <SummaryCard
          label="Waived"
          value={`${summary.waivedCount}`}
          sub="written off"
          tone="zinc"
        />
      </div>

      <div className="mb-6 rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600 shadow-sm">
        Last auto-scan: <strong>{formatRelative(summary.lastScanAt)}</strong>
        {summary.lastScanAt && (
          <span> · {formatDate(summary.lastScanAt.slice(0, 10))}</span>
        )}
        {' · '}
        Auto-scan runs daily at 9:00 UTC. Hit &ldquo;Run scan now&rdquo; to
        apply pending fees immediately.
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No late fees applied yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Configure a late fee on a lease (the lease form has the fields:
            <em> late fee amount</em> and <em>grace days</em>). Once a rent
            schedule is past due beyond the grace period, the daily auto-scan
            will apply the fee. State caps are respected automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Status</Th>
                <Th>Tenant / property</Th>
                <Th>For period due</Th>
                <Th>Amount</Th>
                <Th>Applied</Th>
                <Th>Source</Th>
                <Th>Actions</Th>
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
                return (
                  <tr key={r.id} className="even:bg-zinc-50/40">
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LATE_FEE_STATUS_BADGE[r.status]}`}
                      >
                        {LATE_FEE_STATUS_LABELS[r.status]}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium text-zinc-900">
                        {tenantName}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {propertyName} · {unitLabel}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-sm">
                        {formatDate(r.rent_schedule?.due_date ?? null)}
                      </div>
                      {r.rent_schedule && (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          Rent {formatMoney(r.rent_schedule.amount)} · paid{' '}
                          {formatMoney(r.rent_schedule.paid_amount)}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="font-medium">{formatMoney(r.amount)}</div>
                      {r.state_max_percent !== null && (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          State cap: {r.state_max_percent}% of rent
                        </div>
                      )}
                    </Td>
                    <Td>{formatDate(r.applied_on)}</Td>
                    <Td>
                      <span className="text-xs text-zinc-600">
                        {LATE_FEE_SOURCE_LABELS[r.source]}
                      </span>
                    </Td>
                    <Td>
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <LateFeeMarkPaidButton chargeId={r.id} />
                          <LateFeeWaiveButton chargeId={r.id} />
                        </div>
                      )}
                      {r.status === 'paid' && r.paid_at && (
                        <span className="text-xs text-zinc-500">
                          {formatDate(r.paid_at.slice(0, 10))}
                        </span>
                      )}
                      {r.status === 'waived' && r.waived_reason && (
                        <span className="text-xs text-zinc-500">
                          {r.waived_reason}
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

      <details className="mt-6 rounded-md border border-zinc-200 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-700">
          How auto-scan works
        </summary>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-zinc-600">
          <li>
            Runs daily at 9:00 UTC (4:00 AM ET). Click{' '}
            <em>Run scan now</em> to trigger it immediately.
          </li>
          <li>
            Looks at every rent schedule line that&rsquo;s past due and not
            paid in full. If the lease has a late fee configured (amount +
            grace days) and the grace period has passed, a charge is applied.
          </li>
          <li>
            <strong>State caps are respected.</strong> If your state limits
            late fees to a percentage of rent (e.g.,{' '}
            <Link
              href="/dashboard/compliance"
              className="text-indigo-600 hover:text-indigo-700"
            >
              Compliance
            </Link>{' '}
            shows your state&rsquo;s rule), the configured fee is reduced to
            the cap. The cap percentage at apply time is recorded for legal
            audit.
          </li>
          <li>
            <strong>One auto-fee per day per rent line.</strong> Re-running
            the scan won&rsquo;t double-charge. Manual fees you add yourself
            don&rsquo;t conflict.
          </li>
          <li>
            <strong>No fee for paid-in-full lines.</strong> Once a tenant
            catches up, no new fees accrue.
          </li>
        </ul>
      </details>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: 'amber' | 'emerald' | 'zinc'
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-zinc-200 bg-zinc-50'
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>
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
