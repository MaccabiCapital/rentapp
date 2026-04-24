// ============================================================
// Dashboard → Rent
// ============================================================
//
// Sprint 12 Part B: manual + simulated rent collection. We
// intentionally skip Stripe until Sprint 3 is unblocked (LLC +
// tenant-interview trust concerns). Everything on this page uses
// real payment rows — marking paid creates a completed payment,
// simulating a cycle bulk-creates payment rows tagged [SIMULATED].

import Link from 'next/link'
import { now } from '@/app/lib/now'
import { ensureRentSchedules } from '@/app/actions/rent'
import { getRentSchedulesInWindow } from '@/app/lib/queries/rent-schedules'
import {
  RENT_SCHEDULE_STATUS_LABELS,
  type RentScheduleStatus,
} from '@/app/lib/schemas/rent-schedule'
import { SimulateRentButton } from '@/app/ui/simulate-rent-button'
import { MarkRentPaidButton } from '@/app/ui/mark-rent-paid-button'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_BADGE: Record<RentScheduleStatus, string> = {
  upcoming: 'bg-zinc-100 text-zinc-700',
  due: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  skipped: 'bg-zinc-200 text-zinc-600',
}

export default async function RentPage() {
  // Idempotent — generates the next 3 weeks and back-fills the
  // last month if rows are missing. Also flips upcoming→due and
  // upcoming/due→overdue where time has moved on.
  await ensureRentSchedules()

  // Show a generous window so the landlord can scroll back-and-forth.
  const nowMs = now()
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const fromIso = new Date(nowMs - 60 * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)
  const toIso = new Date(nowMs + 60 * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)

  const rows = await getRentSchedulesInWindow(fromIso, toIso)

  if (rows.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Rent</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Scheduled rent, manual collection, and cycle simulation.
            </p>
          </div>
          <SimulateRentButton />
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No scheduled rent yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Rent lines are generated automatically from your active leases.
            Make sure at least one lease is in &ldquo;active&rdquo; status
            and has a monthly rent.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/tenants"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Go to tenants
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Segment by status buckets so the grid reads at a glance.
  const overdue = rows.filter((r) => r.status === 'overdue')
  const due = rows.filter((r) => r.status === 'due')
  const upcoming = rows.filter((r) => r.status === 'upcoming')
  const paid = rows.filter((r) => r.status === 'paid')
  const other = rows.filter(
    (r) => r.status === 'partial' || r.status === 'skipped',
  )

  const openOwed =
    overdue.reduce((s, r) => s + (r.amount - r.paid_amount), 0) +
    due.reduce((s, r) => s + (r.amount - r.paid_amount), 0)
  const collectedYtd = paid.reduce((s, r) => s + r.paid_amount, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Rent</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {overdue.length > 0 ? (
              <>
                <span className="font-medium text-red-700">
                  {formatCurrency(openOwed)} open
                </span>{' '}
                across {overdue.length + due.length} rent line
                {overdue.length + due.length === 1 ? '' : 's'} · {paid.length}{' '}
                paid in window
              </>
            ) : (
              <>
                {formatCurrency(openOwed)} open · {paid.length} paid in window
                · {formatCurrency(collectedYtd)} collected
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/rent/import"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Import leases
          </Link>
          <SimulateRentButton />
        </div>
      </div>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="font-medium">Heads up:</span> Stripe-connected rent
        collection arrives in Sprint 3. Until then, mark paid manually or use
        <span className="font-medium"> Simulate rent cycle </span>
        to walk through the flow.
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Due</Th>
              <Th>Tenant / unit</Th>
              <Th>Amount</Th>
              <Th>Paid</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {[...overdue, ...due, ...upcoming, ...other, ...paid].map((r) => {
              const unitLabel = r.lease.unit?.property?.name
                ? `${r.lease.unit.property.name}${
                    r.lease.unit.unit_number
                      ? ` · ${r.lease.unit.unit_number}`
                      : ''
                  }`
                : 'Unit'
              const tenantName = r.lease.tenant
                ? `${r.lease.tenant.first_name} ${r.lease.tenant.last_name}`
                : 'Tenant'
              return (
                <tr key={r.id} className="even:bg-zinc-50/40">
                  <Td>
                    <div className="text-sm text-zinc-900">
                      {formatDate(r.due_date)}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-sm font-medium text-zinc-900">
                      {tenantName}
                    </div>
                    <div className="text-xs text-zinc-500">{unitLabel}</div>
                  </Td>
                  <Td>{formatCurrency(r.amount)}</Td>
                  <Td>
                    {r.paid_amount > 0 ? formatCurrency(r.paid_amount) : '—'}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                    >
                      {RENT_SCHEDULE_STATUS_LABELS[r.status]}
                    </span>
                    {r.method && (
                      <div className="mt-1 text-xs text-zinc-500">
                        via {r.method}
                      </div>
                    )}
                  </Td>
                  <Td className="text-right">
                    <MarkRentPaidButton
                      scheduleId={r.id}
                      disabled={
                        r.status === 'paid' || r.status === 'skipped'
                      }
                    />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-zinc-900 ${className ?? ''}`}>
      {children}
    </td>
  )
}
