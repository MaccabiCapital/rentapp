// ============================================================
// Dashboard → Reports
// ============================================================
//
// Portfolio-level analytics. Five panels: portfolio snapshot,
// rent collection, maintenance, expenses YTD (Schedule E), lease
// flow. All numbers computed live from source tables.

import Link from 'next/link'
import {
  getPortfolioReport,
  getRentReport,
  getMaintenanceReport,
  getExpensesReport,
  getLeaseFlowReport,
} from '@/app/lib/queries/reports'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`
}

const EXPENSE_LABELS: Record<string, string> = {
  advertising: 'Advertising',
  cleaning_maintenance: 'Cleaning & maintenance',
  commissions: 'Commissions',
  insurance: 'Insurance',
  legal_professional: 'Legal / professional',
  management_fees: 'Management fees',
  mortgage_interest: 'Mortgage interest',
  other_interest: 'Other interest',
  repairs: 'Repairs',
  supplies: 'Supplies',
  taxes: 'Taxes',
  utilities: 'Utilities',
  depreciation: 'Depreciation',
  other: 'Other',
}

const URGENCY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
  unknown: 'Unknown',
}

const URGENCY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-amber-100 text-amber-800',
  low: 'bg-zinc-100 text-zinc-700',
  unknown: 'bg-zinc-100 text-zinc-500',
}

export default async function ReportsPage() {
  const [portfolio, rent, maintenance, expenses, leaseFlow] =
    await Promise.all([
      getPortfolioReport(),
      getRentReport(),
      getMaintenanceReport(),
      getExpensesReport(),
      getLeaseFlowReport(),
    ])

  const netOperating = rent.paidYtd - expenses.totalYtd

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Reports</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Portfolio-level numbers computed live from your records.
          Year-to-date figures cover {new Date().getFullYear()}.
        </p>
      </div>

      {/* Portfolio snapshot */}
      <Section title="Portfolio">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Properties" value={portfolio.totalProperties.toString()} />
          <Stat
            label="Units"
            value={portfolio.totalUnits.toString()}
            sub={`${portfolio.occupiedUnits} occupied · ${portfolio.vacantUnits} vacant`}
          />
          <Stat
            label="Occupancy"
            value={formatPct(portfolio.occupancyPct)}
            tone={portfolio.occupancyPct >= 90 ? 'good' : portfolio.occupancyPct >= 75 ? 'neutral' : 'bad'}
          />
          <Stat
            label="Notice given"
            value={portfolio.noticeGivenUnits.toString()}
            sub="units"
          />
          <Stat
            label="Monthly rent (active)"
            value={formatCurrency(portfolio.monthlyRentInEffect)}
            sub="leased rent roll"
          />
          <Stat
            label="Monthly potential"
            value={formatCurrency(portfolio.monthlyRentPotential)}
            sub="if 100% occupied at list rent"
          />
        </div>
      </Section>

      {/* Rent collection */}
      <Section title="Rent collection">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Collected this month"
            value={formatCurrency(rent.paidThisMonth)}
          />
          <Stat label="Collected YTD" value={formatCurrency(rent.paidYtd)} />
          <Stat
            label="Collection rate YTD"
            value={formatPct(rent.collectionRatePct)}
            tone={
              rent.collectionRatePct >= 95
                ? 'good'
                : rent.collectionRatePct >= 85
                  ? 'neutral'
                  : 'bad'
            }
          />
          <Stat
            label="Outstanding"
            value={formatCurrency(rent.outstandingNow)}
            sub={`${rent.overdueCount} overdue line${rent.overdueCount === 1 ? '' : 's'}`}
            tone={rent.outstandingNow > 0 ? 'bad' : 'good'}
          />
          <Stat
            label="Late fees YTD"
            value={formatCurrency(rent.lateFeeYtd)}
          />
        </div>
      </Section>

      {/* Lease flow */}
      <Section title="Lease flow">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Active leases"
            value={leaseFlow.activeLeases.toString()}
          />
          <Stat
            label="Expiring in 90 days"
            value={leaseFlow.leasesEndingWithin90.toString()}
            tone={leaseFlow.leasesEndingWithin90 > 0 ? 'neutral' : 'good'}
          />
          <Stat
            label="Tenants with notice given"
            value={leaseFlow.tenantsWithNoticeGiven.toString()}
            tone={leaseFlow.tenantsWithNoticeGiven > 0 ? 'neutral' : 'good'}
          />
          <Stat
            label="Leases signed YTD"
            value={leaseFlow.signedThisYear.toString()}
          />
        </div>
      </Section>

      {/* Maintenance */}
      <Section title="Maintenance">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Open items"
            value={maintenance.openCount.toString()}
            tone={maintenance.openCount > 0 ? 'neutral' : 'good'}
          />
          <Stat
            label="In progress"
            value={maintenance.inProgressCount.toString()}
          />
          <Stat
            label="Resolved this month"
            value={maintenance.resolvedThisMonth.toString()}
          />
          <Stat
            label="Avg days to resolve"
            value={
              maintenance.avgDaysToResolve === null
                ? '—'
                : maintenance.avgDaysToResolve.toString()
            }
          />
        </div>
        {maintenance.byUrgency.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {maintenance.byUrgency.map((s) => (
              <span
                key={s.urgency}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_COLORS[s.urgency] ?? 'bg-zinc-100 text-zinc-700'}`}
              >
                {URGENCY_LABELS[s.urgency] ?? s.urgency} · {s.count}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Expenses YTD */}
      <Section title={`Expenses · ${new Date().getFullYear()}`}>
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat
            label="Total expenses YTD"
            value={formatCurrency(expenses.totalYtd)}
          />
          <Stat
            label="Rent collected YTD"
            value={formatCurrency(rent.paidYtd)}
          />
          <Stat
            label="Net operating YTD"
            value={formatCurrency(netOperating)}
            tone={netOperating >= 0 ? 'good' : 'bad'}
            sub="rent − expenses"
          />
        </div>

        {expenses.byCategory.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    % of total
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {expenses.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="px-3 py-2 text-zinc-900">
                      {EXPENSE_LABELS[c.category] ?? c.category}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                      {formatPct(c.pct)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${Math.min(100, c.pct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-sm text-zinc-500">
            No expenses logged for {new Date().getFullYear()} yet.
            <div className="mt-2">
              <Link
                href="/dashboard/financials"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Open Financials to log expenses →
              </Link>
            </div>
          </div>
        )}
      </Section>
    </div>
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
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'good' | 'neutral' | 'bad'
}) {
  const color =
    tone === 'bad'
      ? 'text-red-700'
      : tone === 'neutral'
        ? 'text-amber-700'
        : tone === 'good'
          ? 'text-emerald-700'
          : 'text-zinc-900'
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}
