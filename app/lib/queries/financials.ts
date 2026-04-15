// ============================================================
// Financial queries — expenses + income + P&L rollups
// ============================================================
//
// Unlike Sprints 1-5, financials pulls from THREE sources:
//   - public.expenses (Sprint 7) — non-maintenance expenses
//   - public.maintenance_requests (Sprint 4) — labor + materials
//   - public.payments (Sprint 0) — rent income (manual + Stripe)
//
// The dashboard folds all three into a single per-property
// income/expense/NOI view for tax reporting.

import { createServerClient } from '@/lib/supabase/server'
import type {
  Expense,
  ExpenseCategory,
} from '@/app/lib/schemas/expense'
import type { Property } from '@/app/lib/schemas/property'

export type ExpenseWithProperty = Expense & {
  property: Pick<Property, 'id' | 'name'>
}

export async function getExpenses(
  fromDate?: string,
  toDate?: string,
): Promise<ExpenseWithProperty[]> {
  const supabase = await createServerClient()
  let query = supabase
    .from('expenses')
    .select('*, property:properties!inner(id, name)')
    .is('deleted_at', null)
    .is('properties.deleted_at', null)
    .order('incurred_on', { ascending: false })

  if (fromDate) query = query.gte('incurred_on', fromDate)
  if (toDate) query = query.lte('incurred_on', toDate)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ExpenseWithProperty[]
}

export async function getExpense(id: string): Promise<ExpenseWithProperty | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*, property:properties!inner(id, name)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as ExpenseWithProperty | null
}

// Manual + Stripe rent income (from payments table). Sprint 3
// will start inserting Stripe-originated rows; for now this is
// manual-only (Sprint 7 adds the form).
export type IncomeRow = {
  id: string
  amount: number
  due_date: string
  paid_at: string | null
  payment_method: string | null
  lease_id: string
  property_id: string | null
  property_name: string | null
}

export async function getIncome(
  fromDate?: string,
  toDate?: string,
): Promise<IncomeRow[]> {
  const supabase = await createServerClient()
  // Join payments → leases → units → properties so we can
  // attribute each payment to a property.
  let query = supabase
    .from('payments')
    .select(
      'id, amount, due_date, paid_at, payment_method, lease_id, lease:leases!inner(unit:units!inner(property_id, property:properties!inner(id, name)))',
    )
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false, nullsFirst: false })

  if (fromDate) query = query.gte('paid_at', fromDate)
  if (toDate) query = query.lte('paid_at', toDate)

  const { data, error } = await query
  if (error) throw error

  // Flatten the nested join into a clean IncomeRow shape.
  return (data ?? []).map((row) => {
    // Supabase inner joins return objects (not arrays) when the
    // FK is single-row, but the generated type is wide. Cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const unit = r.lease?.unit
    const property = unit?.property
    return {
      id: r.id,
      amount: Number(r.amount),
      due_date: r.due_date,
      paid_at: r.paid_at,
      payment_method: r.payment_method,
      lease_id: r.lease_id,
      property_id: property?.id ?? null,
      property_name: property?.name ?? null,
    }
  })
}

// Maintenance cost rollup pulled from the maintenance_requests
// table. Counted as an expense under "Cleaning & maintenance" in
// the Schedule E export.
export type MaintenanceCostRow = {
  id: string
  property_id: string
  unit_id: string
  title: string
  cost_materials: number
  cost_labor: number
  total: number
  resolved_at: string | null
  created_at: string
}

export async function getMaintenanceCosts(
  fromDate?: string,
  toDate?: string,
): Promise<MaintenanceCostRow[]> {
  const supabase = await createServerClient()
  // Use resolved_at when present, else created_at. The SQL filter
  // is rough — we'll post-filter in memory for date precision.
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(
      'id, unit_id, title, cost_materials, cost_labor, resolved_at, created_at, unit:units!inner(property_id, property:properties!inner(id, name))',
    )
    .or('cost_materials.gt.0,cost_labor.gt.0')
    .order('resolved_at', { ascending: false, nullsFirst: false })
  if (error) throw error

  const rows = (data ?? []).map((raw) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = raw as any
    const materials = Number(r.cost_materials ?? 0)
    const labor = Number(r.cost_labor ?? 0)
    return {
      id: r.id,
      property_id: r.unit?.property_id ?? r.unit?.property?.id,
      unit_id: r.unit_id,
      title: r.title,
      cost_materials: materials,
      cost_labor: labor,
      total: materials + labor,
      resolved_at: r.resolved_at,
      created_at: r.created_at,
    }
  }) as MaintenanceCostRow[]

  // Filter by date range using whichever timestamp is available
  const from = fromDate ? new Date(fromDate).getTime() : null
  const to = toDate ? new Date(toDate).getTime() : null
  return rows.filter((r) => {
    const refIso = r.resolved_at ?? r.created_at
    const ref = new Date(refIso).getTime()
    if (from !== null && ref < from) return false
    if (to !== null && ref > to) return false
    return true
  })
}

// Per-property P&L rollup combining all three sources.
export type PropertyPnL = {
  property_id: string
  property_name: string
  income: number
  expenses_logged: number
  maintenance_costs: number
  total_expenses: number
  net_operating_income: number
}

export async function getPortfolioPnL(
  fromDate?: string,
  toDate?: string,
): Promise<{
  rows: PropertyPnL[]
  totals: {
    income: number
    expenses_logged: number
    maintenance_costs: number
    total_expenses: number
    net_operating_income: number
  }
}> {
  const [expenses, income, maintenance] = await Promise.all([
    getExpenses(fromDate, toDate),
    getIncome(fromDate, toDate),
    getMaintenanceCosts(fromDate, toDate),
  ])

  // Build a property lookup table from whichever source mentions
  // the property first.
  const byProperty = new Map<string, PropertyPnL>()
  const ensure = (id: string | null, name: string | null) => {
    if (!id) return null
    const existing = byProperty.get(id)
    if (existing) return existing
    const row: PropertyPnL = {
      property_id: id,
      property_name: name ?? 'Unknown property',
      income: 0,
      expenses_logged: 0,
      maintenance_costs: 0,
      total_expenses: 0,
      net_operating_income: 0,
    }
    byProperty.set(id, row)
    return row
  }

  for (const e of expenses) {
    const row = ensure(e.property_id, e.property.name)
    if (row) row.expenses_logged += Number(e.amount)
  }
  for (const i of income) {
    const row = ensure(i.property_id, i.property_name)
    if (row) row.income += i.amount
  }
  for (const m of maintenance) {
    const row = ensure(m.property_id, null)
    if (row) row.maintenance_costs += m.total
  }

  const rows = Array.from(byProperty.values())
    .map((r) => ({
      ...r,
      total_expenses: r.expenses_logged + r.maintenance_costs,
      net_operating_income:
        r.income - (r.expenses_logged + r.maintenance_costs),
    }))
    .sort((a, b) => b.income - a.income)

  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expenses_logged: acc.expenses_logged + r.expenses_logged,
      maintenance_costs: acc.maintenance_costs + r.maintenance_costs,
      total_expenses: acc.total_expenses + r.total_expenses,
      net_operating_income: acc.net_operating_income + r.net_operating_income,
    }),
    {
      income: 0,
      expenses_logged: 0,
      maintenance_costs: 0,
      total_expenses: 0,
      net_operating_income: 0,
    },
  )

  return { rows, totals }
}

// Per-property expense rollup by category — used for the drill-
// down page and Schedule E CSV export.
export async function getExpensesByCategory(
  propertyId: string,
  fromDate?: string,
  toDate?: string,
): Promise<Record<ExpenseCategory, number>> {
  const expenses = await getExpenses(fromDate, toDate)
  const maintenance = await getMaintenanceCosts(fromDate, toDate)

  const result: Record<ExpenseCategory, number> = {
    advertising: 0,
    cleaning_maintenance: 0,
    commissions: 0,
    insurance: 0,
    legal_professional: 0,
    management_fees: 0,
    mortgage_interest: 0,
    other_interest: 0,
    repairs: 0,
    supplies: 0,
    taxes: 0,
    utilities: 0,
    depreciation: 0,
    other: 0,
  }

  for (const e of expenses) {
    if (e.property_id === propertyId) result[e.category] += Number(e.amount)
  }
  for (const m of maintenance) {
    if (m.property_id === propertyId) result.cleaning_maintenance += m.total
  }

  return result
}
