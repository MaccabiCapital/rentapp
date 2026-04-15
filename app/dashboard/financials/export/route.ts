// ============================================================
// Financials CSV export — Schedule E aligned
// ============================================================
//
// Returns a CSV stream the landlord can hand straight to their
// accountant. One row per transaction with a Schedule E line
// number so aggregation is trivial on the accountant's side.
//
// Query params:
//   from   (YYYY-MM-DD) — start date, defaults to Jan 1 of current year
//   to     (YYYY-MM-DD) — end date, defaults to Dec 31 of current year
//   property (uuid)      — optional filter to a single property

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  getExpenses,
  getIncome,
  getMaintenanceCosts,
} from '@/app/lib/queries/financials'
import {
  SCHEDULE_E_LINES,
  EXPENSE_CATEGORY_LABELS,
} from '@/app/lib/schemas/expense'

function yearStart(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-01-01`
}
function yearEnd(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-12-31`
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatAmount(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

export async function GET(request: Request) {
  // Authz: hit the auth check even though the queries are RLS-
  // scoped, so we return a 401 instead of an empty CSV for
  // anonymous callers.
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  const fromDate = url.searchParams.get('from') ?? yearStart()
  const toDate = url.searchParams.get('to') ?? yearEnd()
  const filterProperty = url.searchParams.get('property')

  const [expenses, income, maintenance] = await Promise.all([
    getExpenses(fromDate, toDate),
    getIncome(fromDate, toDate),
    getMaintenanceCosts(fromDate, toDate),
  ])

  const filteredExpenses = filterProperty
    ? expenses.filter((e) => e.property_id === filterProperty)
    : expenses
  const filteredIncome = filterProperty
    ? income.filter((i) => i.property_id === filterProperty)
    : income
  const filteredMaintenance = filterProperty
    ? maintenance.filter((m) => m.property_id === filterProperty)
    : maintenance

  const rows: string[] = []
  rows.push(
    [
      'date',
      'property',
      'type',
      'schedule_e_line',
      'category',
      'vendor_or_payer',
      'description',
      'amount',
    ]
      .map(csvEscape)
      .join(','),
  )

  for (const i of filteredIncome) {
    rows.push(
      [
        i.paid_at ? i.paid_at.slice(0, 10) : i.due_date,
        i.property_name ?? 'Unknown',
        'income',
        '3', // Schedule E line 3 — rents received
        'Rents received',
        i.payment_method ?? '',
        `Lease ${i.lease_id.slice(0, 8)}`,
        formatAmount(i.amount),
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  for (const e of filteredExpenses) {
    rows.push(
      [
        e.incurred_on,
        e.property.name,
        'expense',
        SCHEDULE_E_LINES[e.category],
        EXPENSE_CATEGORY_LABELS[e.category],
        e.vendor ?? '',
        e.description ?? '',
        formatAmount(Number(e.amount)),
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  // Maintenance costs are categorized under Schedule E line 7
  // (Cleaning & maintenance). Distinction from repairs (line 14)
  // is subtle and landlords often get it wrong; we go with line 7
  // as the safe default for maintenance requests.
  for (const m of filteredMaintenance) {
    // Look up property name from expenses/income rows we already
    // fetched (rather than another DB round trip)
    const propertyName =
      filteredExpenses.find((e) => e.property_id === m.property_id)?.property
        .name ??
      filteredIncome.find((i) => i.property_id === m.property_id)
        ?.property_name ??
      'Unknown property'
    rows.push(
      [
        m.resolved_at ? m.resolved_at.slice(0, 10) : m.created_at.slice(0, 10),
        propertyName,
        'expense',
        SCHEDULE_E_LINES.cleaning_maintenance,
        EXPENSE_CATEGORY_LABELS.cleaning_maintenance,
        '', // vendor not tracked per maintenance row
        m.title,
        formatAmount(m.total),
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  const csv = rows.join('\n') + '\n'
  const filename = `rentbase-schedule-e-${fromDate}-to-${toDate}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
