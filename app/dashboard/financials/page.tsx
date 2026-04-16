// ============================================================
// Dashboard → Financials → YTD portfolio P&L
// ============================================================

import Link from 'next/link'
import { getPortfolioPnL, getExpenses } from '@/app/lib/queries/financials'
import { ExpenseCategoryBadge } from '@/app/ui/expense-category-badge'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function yearStart(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-01-01`
}
function yearEnd(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-12-31`
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams
  const fromDate = from ?? yearStart()
  const toDate = to ?? yearEnd()

  const [pnl, recentExpenses] = await Promise.all([
    getPortfolioPnL(fromDate, toDate),
    getExpenses(fromDate, toDate),
  ])

  const currentYear = new Date().getUTCFullYear()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Financials</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Income minus expenses by property for {currentYear}. Export to CSV
            when you&rsquo;re ready for tax time.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/financials/income/new"
            className="rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Record payment
          </Link>
          <Link
            href="/dashboard/financials/expenses/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Log expense
          </Link>
          <Link
            href={`/dashboard/financials/export?from=${fromDate}&to=${toDate}`}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </Link>
          <a
            href={`/dashboard/financials/tax-package?from=${fromDate}&to=${toDate}`}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Tax package PDF
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="YTD Income"
          value={formatCurrency(pnl.totals.income)}
          tone="green"
        />
        <StatCard
          label="YTD Expenses"
          value={formatCurrency(pnl.totals.total_expenses)}
          tone="red"
        />
        <StatCard
          label="YTD Net Operating Income"
          value={formatCurrency(pnl.totals.net_operating_income)}
          tone={pnl.totals.net_operating_income >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Maintenance (included)"
          value={formatCurrency(pnl.totals.maintenance_costs)}
          tone="zinc"
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-zinc-900">By property</h2>
      {pnl.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No financial activity yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Record a rent payment or log an expense to start building your P&L.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Property</Th>
                <Th>Income</Th>
                <Th>Expenses</Th>
                <Th>Maintenance</Th>
                <Th>NOI</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {pnl.rows.map((r) => (
                <tr key={r.property_id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/financials/${r.property_id}?from=${fromDate}&to=${toDate}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {r.property_name}
                    </Link>
                  </Td>
                  <Td className="text-green-700">
                    {formatCurrency(r.income)}
                  </Td>
                  <Td className="text-red-700">
                    {formatCurrency(r.expenses_logged)}
                  </Td>
                  <Td className="text-red-700">
                    {formatCurrency(r.maintenance_costs)}
                  </Td>
                  <Td
                    className={
                      r.net_operating_income >= 0
                        ? 'font-semibold text-green-700'
                        : 'font-semibold text-red-700'
                    }
                  >
                    {formatCurrency(r.net_operating_income)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-3 text-lg font-semibold text-zinc-900">
        Recent expenses
      </h2>
      {recentExpenses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <p className="text-sm text-zinc-600">
            No expenses logged for {currentYear} yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Date</Th>
                <Th>Property</Th>
                <Th>Category</Th>
                <Th>Vendor</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {recentExpenses.slice(0, 15).map((e) => (
                <tr key={e.id} className="even:bg-zinc-50/40">
                  <Td>{formatDate(e.incurred_on)}</Td>
                  <Td>
                    <Link
                      href={`/dashboard/financials/${e.property_id}?from=${fromDate}&to=${toDate}`}
                      className="text-zinc-700 hover:text-zinc-900"
                    >
                      {e.property.name}
                    </Link>
                  </Td>
                  <Td>
                    <ExpenseCategoryBadge category={e.category} />
                  </Td>
                  <Td>{e.vendor ?? '—'}</Td>
                  <Td className="text-red-700">
                    {formatCurrency(Number(e.amount))}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'green' | 'red' | 'zinc'
}) {
  const valueClass =
    tone === 'green'
      ? 'text-green-700'
      : tone === 'red'
        ? 'text-red-700'
        : 'text-zinc-900'
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className={`text-3xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
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

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-sm text-zinc-900 ${className ?? ''}`}>
      {children}
    </td>
  )
}
