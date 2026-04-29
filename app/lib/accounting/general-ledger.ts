// ============================================================
// General-ledger export — universal double-entry CSV
// ============================================================
//
// Different output format from the Schedule E export (which is
// a flat tax-filing CSV with IRS line numbers). This builder
// produces the standard 6-column double-entry GL that imports
// into QuickBooks Desktop, Xero, Wave, FreshBooks, and any
// accountant tool.
//
// Format:  Date,Account,Debit,Credit,Memo,Class
//
// "Class" is QBO/Xero terminology for per-property tracking.
// We map it to the property name; an accountant can re-map at
// import time if their chart of accounts uses different labels.

import {
  getExpenses,
  getIncome,
  getMaintenanceCosts,
} from '@/app/lib/queries/financials'
import { EXPENSE_CATEGORY_LABELS } from '@/app/lib/schemas/expense'

export type LedgerEntry = {
  date: string
  account: string
  debit: number
  credit: number
  memo: string
  property_class: string
}

// Map our internal expense categories to standard accounting
// chart-of-accounts names. Matches QBO's default "Expense"
// account list closely enough that auto-mapping at import time
// usually works without manual remapping.
const EXPENSE_TO_ACCOUNT: Record<string, string> = {
  cleaning_maintenance: 'Repairs & Maintenance',
  repairs: 'Repairs & Maintenance',
  insurance: 'Insurance',
  taxes: 'Property Taxes',
  utilities: 'Utilities',
  mortgage_interest: 'Mortgage Interest',
  management_fees: 'Management Fees',
  legal_fees: 'Legal & Professional Services',
  advertising: 'Advertising & Marketing',
  travel: 'Travel',
  supplies: 'Office Supplies',
  other: 'Other Operating Expenses',
}

export async function buildGeneralLedger(opts: {
  fromDate: string
  toDate: string
}): Promise<LedgerEntry[]> {
  const [income, expenses, maintenance] = await Promise.all([
    getIncome(opts.fromDate, opts.toDate),
    getExpenses(opts.fromDate, opts.toDate),
    getMaintenanceCosts(opts.fromDate, opts.toDate),
  ])

  const entries: LedgerEntry[] = []

  // ---- Income side: rent payments collected ----
  for (const i of income) {
    const date = (i.paid_at ?? i.due_date ?? '').slice(0, 10)
    if (!date) continue
    const amount = Number(i.amount)
    const propertyName = i.property_name ?? 'Unallocated'
    const memo = `Rent payment · ${i.payment_method ?? 'unknown'} · lease ${i.lease_id.slice(0, 8)}`

    entries.push({
      date,
      account: 'Bank — Operating',
      debit: amount,
      credit: 0,
      memo,
      property_class: propertyName,
    })
    entries.push({
      date,
      account: 'Rental Income',
      debit: 0,
      credit: amount,
      memo,
      property_class: propertyName,
    })
  }

  // ---- Expenses ----
  for (const e of expenses) {
    const date = e.incurred_on
    const amount = Number(e.amount)
    const propertyName = e.property.name
    const accountName =
      EXPENSE_TO_ACCOUNT[e.category] ??
      EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] ??
      'Other Operating Expenses'
    const memo = `${e.vendor ? `${e.vendor} · ` : ''}${e.description ?? ''}`.slice(0, 200)

    entries.push({
      date,
      account: accountName,
      debit: amount,
      credit: 0,
      memo,
      property_class: propertyName,
    })
    entries.push({
      date,
      account: 'Bank — Operating',
      debit: 0,
      credit: amount,
      memo,
      property_class: propertyName,
    })
  }

  // ---- Maintenance ticket costs (booked as Repairs & Maintenance) ----
  // We need to look up property name from expenses/income since the
  // maintenance row only has property_id.
  const propertyNameById = new Map<string, string>()
  for (const e of expenses) propertyNameById.set(e.property_id, e.property.name)
  for (const i of income) {
    if (i.property_id && i.property_name)
      propertyNameById.set(i.property_id, i.property_name)
  }

  for (const m of maintenance) {
    const date = (m.resolved_at ?? m.created_at).slice(0, 10)
    const amount = Number(m.total)
    if (amount <= 0) continue
    const propertyName =
      propertyNameById.get(m.property_id) ?? 'Unallocated'
    const memo = `Maintenance · ${m.title}`.slice(0, 200)

    entries.push({
      date,
      account: 'Repairs & Maintenance',
      debit: amount,
      credit: 0,
      memo,
      property_class: propertyName,
    })
    entries.push({
      date,
      account: 'Bank — Operating',
      debit: 0,
      credit: amount,
      memo,
      property_class: propertyName,
    })
  }

  // Chronological for accountant readability
  entries.sort((a, b) => a.date.localeCompare(b.date))
  return entries
}

export function ledgerToCsv(entries: LedgerEntry[]): string {
  const headers = ['Date', 'Account', 'Debit', 'Credit', 'Memo', 'Class']
  const rows = entries.map((e) => [
    e.date,
    csvEscape(e.account),
    e.debit > 0 ? e.debit.toFixed(2) : '',
    e.credit > 0 ? e.credit.toFixed(2) : '',
    csvEscape(e.memo),
    csvEscape(e.property_class),
  ])
  return [headers, ...rows].map((row) => row.join(',')).join('\n') + '\n'
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
