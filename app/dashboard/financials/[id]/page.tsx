// ============================================================
// Dashboard → Financials → [propertyId] → per-property ledger
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProperty } from '@/app/lib/queries/properties'
import {
  getExpenses,
  getIncome,
  getMaintenanceCosts,
  getExpensesByCategory,
} from '@/app/lib/queries/financials'
import {
  EXPENSE_CATEGORY_VALUES,
  type ExpenseCategory,
} from '@/app/lib/schemas/expense'
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

export default async function PropertyLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { id } = await params
  const { from, to } = await searchParams
  const fromDate = from ?? yearStart()
  const toDate = to ?? yearEnd()

  const property = await getProperty(id)
  if (!property) notFound()

  const [allExpenses, allIncome, allMaintenance, byCategory] =
    await Promise.all([
      getExpenses(fromDate, toDate),
      getIncome(fromDate, toDate),
      getMaintenanceCosts(fromDate, toDate),
      getExpensesByCategory(id, fromDate, toDate),
    ])

  const expenses = allExpenses.filter((e) => e.property_id === id)
  const income = allIncome.filter((i) => i.property_id === id)
  const maintenance = allMaintenance.filter((m) => m.property_id === id)

  const totalIncome = income.reduce((s, i) => s + i.amount, 0)
  const expensesLogged = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const maintenanceCosts = maintenance.reduce((s, m) => s + m.total, 0)
  const totalExpenses = expensesLogged + maintenanceCosts
  const noi = totalIncome - totalExpenses

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/financials" className="hover:text-zinc-900">
          Financials
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{property.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {property.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDate(fromDate)} – {formatDate(toDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/financials/expenses/new?property=${id}`}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Log expense
          </Link>
          <Link
            href={`/dashboard/financials/export?from=${fromDate}&to=${toDate}&property=${id}`}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Income" value={formatCurrency(totalIncome)} tone="green" />
        <StatCard
          label="Expenses"
          value={formatCurrency(expensesLogged)}
          tone="red"
        />
        <StatCard
          label="Maintenance"
          value={formatCurrency(maintenanceCosts)}
          tone="red"
        />
        <StatCard
          label="Net Operating Income"
          value={formatCurrency(noi)}
          tone={noi >= 0 ? 'green' : 'red'}
        />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-zinc-900">
        Expenses by category
      </h2>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Category</Th>
              <Th>Schedule E line</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {EXPENSE_CATEGORY_VALUES.filter(
              (c) => (byCategory[c] ?? 0) > 0,
            ).map((c) => (
              <tr key={c} className="even:bg-zinc-50/40">
                <Td>
                  <ExpenseCategoryBadge category={c as ExpenseCategory} />
                </Td>
                <Td className="text-zinc-500">
                  Line {scheduleELine(c as ExpenseCategory)}
                </Td>
                <Td className="font-medium text-red-700">
                  {formatCurrency(byCategory[c] ?? 0)}
                </Td>
              </tr>
            ))}
            {Object.values(byCategory).every((v) => v === 0) && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No expenses in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-zinc-900">
        Income ledger
      </h2>
      {income.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <p className="text-sm text-zinc-600">
            No rent received in this period.{' '}
            <Link
              href="/dashboard/financials/income/new"
              className="text-indigo-600 hover:text-indigo-700"
            >
              Record a payment
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Paid on</Th>
                <Th>Method</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {income.map((i) => (
                <tr key={i.id} className="even:bg-zinc-50/40">
                  <Td>{i.paid_at ? formatDate(i.paid_at) : formatDate(i.due_date)}</Td>
                  <Td>{i.payment_method ?? '—'}</Td>
                  <Td className="text-green-700">{formatCurrency(i.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-3 text-lg font-semibold text-zinc-900">
        Expense ledger
      </h2>
      {expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <p className="text-sm text-zinc-600">No expenses in this period.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Vendor</Th>
                <Th>Description</Th>
                <Th>Amount</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {expenses.map((e) => (
                <tr key={e.id} className="even:bg-zinc-50/40">
                  <Td>{formatDate(e.incurred_on)}</Td>
                  <Td>
                    <ExpenseCategoryBadge category={e.category} />
                  </Td>
                  <Td>{e.vendor ?? '—'}</Td>
                  <Td className="text-zinc-600">{e.description ?? '—'}</Td>
                  <Td className="text-red-700">
                    {formatCurrency(Number(e.amount))}
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/financials/expenses/${e.id}/edit`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </Link>
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

function scheduleELine(category: ExpenseCategory): string {
  const lines: Record<ExpenseCategory, string> = {
    advertising: '5',
    cleaning_maintenance: '7',
    commissions: '8',
    insurance: '9',
    legal_professional: '10',
    management_fees: '11',
    mortgage_interest: '12',
    other_interest: '13',
    repairs: '14',
    supplies: '15',
    taxes: '16',
    utilities: '17',
    depreciation: '18',
    other: '19',
  }
  return lines[category] ?? '—'
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
