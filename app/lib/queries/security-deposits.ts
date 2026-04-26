// ============================================================
// Security deposit settlement queries
// ============================================================
//
// Reads: list, detail, lease lookup, suggestion-source pull from
// inspection-compare. Writes live in app/actions/security-deposits.ts.

import { createServerClient } from '@/lib/supabase/server'
import type {
  SecurityDepositSettlement,
  DeductionItem,
} from '@/app/lib/schemas/security-deposit'
import { getInspectionPair } from '@/app/lib/queries/inspection-compare'

// ------------------------------------------------------------
// Joined types
// ------------------------------------------------------------

export type SettlementLeaseContext = {
  id: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number | null
  tenant: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    forwarding_street_address: string | null
    forwarding_unit: string | null
    forwarding_city: string | null
    forwarding_state: string | null
    forwarding_postal_code: string | null
  } | null
  unit: {
    id: string
    unit_number: string | null
    property: {
      id: string
      name: string
      street_address: string | null
      city: string | null
      state: string | null
      postal_code: string | null
    } | null
  } | null
}

export type SettlementListRow = SecurityDepositSettlement & {
  lease: SettlementLeaseContext | null
  totalDeductions: number
  net: number
}

export type SettlementDetail = SecurityDepositSettlement & {
  lease: SettlementLeaseContext | null
  items: DeductionItem[]
  totalDeductions: number
  net: number
}

const LEASE_CONTEXT_SELECT = `
  id,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  tenant:tenants (
    id, first_name, last_name, email, phone,
    forwarding_street_address, forwarding_unit, forwarding_city,
    forwarding_state, forwarding_postal_code
  ),
  unit:units (
    id, unit_number,
    property:properties (
      id, name, street_address, city, state, postal_code
    )
  )
`

function rowsToTotals(items: DeductionItem[], originalDeposit: number) {
  const totalDeductions = items.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  )
  const net = Number(originalDeposit) - totalDeductions
  return {
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    net: Math.round(net * 100) / 100,
  }
}

// ------------------------------------------------------------
// List
// ------------------------------------------------------------

export async function listSettlements(): Promise<SettlementListRow[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('security_deposit_settlements')
    .select(
      `*,
       lease:leases ( ${LEASE_CONTEXT_SELECT} ),
       items:security_deposit_deduction_items ( id, amount )`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const items = (row.items ?? []) as { id: string; amount: number }[]
    const originalDeposit = Number(row.original_deposit)
    const totalDeductions = items.reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    )
    const net = originalDeposit - totalDeductions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { items: _items, ...settlement } = row
    return {
      ...settlement,
      original_deposit: originalDeposit,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      net: Math.round(net * 100) / 100,
    } as SettlementListRow
  })
}

// ------------------------------------------------------------
// Detail
// ------------------------------------------------------------

export async function getSettlement(
  id: string,
): Promise<SettlementDetail | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('security_deposit_settlements')
    .select(
      `*,
       lease:leases ( ${LEASE_CONTEXT_SELECT} ),
       items:security_deposit_deduction_items ( * )`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  const items = ((row.items ?? []) as DeductionItem[]).map((i) => ({
    ...i,
    amount: Number(i.amount),
  }))
  items.sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  )

  const originalDeposit = Number(row.original_deposit)
  const totals = rowsToTotals(items, originalDeposit)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { items: _items, ...settlement } = row

  return {
    ...settlement,
    original_deposit: originalDeposit,
    items,
    ...totals,
  } as SettlementDetail
}

// ------------------------------------------------------------
// Lease helper: existing settlement?
// ------------------------------------------------------------

export async function getSettlementForLease(
  leaseId: string,
): Promise<SecurityDepositSettlement | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('security_deposit_settlements')
    .select('*')
    .eq('lease_id', leaseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  return {
    ...row,
    original_deposit: Number(row.original_deposit),
  } as SecurityDepositSettlement
}

// ------------------------------------------------------------
// Lease lookup for the create form (active + recently ended leases)
// ------------------------------------------------------------

export type LeasePickerRow = {
  id: string
  tenant_name: string
  property_name: string
  unit_number: string | null
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number | null
  status: string
  has_settlement: boolean
}

export async function getLeasesForSettlementPicker(): Promise<
  LeasePickerRow[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select(
      `id, start_date, end_date, monthly_rent, security_deposit, status,
       tenant:tenants ( id, first_name, last_name ),
       unit:units (
         unit_number,
         property:properties ( name )
       ),
       settlements:security_deposit_settlements!security_deposit_settlements_lease_id_fkey (
         id, deleted_at
       )`,
    )
    .is('deleted_at', null)
    .order('end_date', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((l) => {
    const tenantName = l.tenant
      ? `${l.tenant.first_name} ${l.tenant.last_name}`.trim()
      : 'Unknown tenant'
    const hasSettlement = (l.settlements ?? []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.deleted_at === null,
    )
    return {
      id: l.id,
      tenant_name: tenantName,
      property_name: l.unit?.property?.name ?? 'Unknown property',
      unit_number: l.unit?.unit_number ?? null,
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: Number(l.monthly_rent),
      security_deposit:
        l.security_deposit === null ? null : Number(l.security_deposit),
      status: l.status,
      has_settlement: hasSettlement,
    }
  })
}

// ------------------------------------------------------------
// Pre-population: pull damage + new_damage rows from the most
// recent move-out inspection on the lease, returning a list of
// suggested deductions the landlord can review.
// ------------------------------------------------------------

export type SuggestedDeduction = {
  category: 'damage'
  description: string
  amount: 0 // landlord fills in
  inspection_item_id: string
  photos: string[]
  source_room: string
  source_item: string
  move_in_condition: string | null
  move_out_condition: string | null
}

export async function getDeductionSuggestionsForLease(
  leaseId: string,
): Promise<SuggestedDeduction[]> {
  const supabase = await createServerClient()
  // Find newest move-out inspection on this lease
  const { data: moveOuts, error: mErr } = await supabase
    .from('inspections')
    .select('id, lease_id, type, status, deleted_at')
    .eq('lease_id', leaseId)
    .eq('type', 'move_out')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (mErr) throw mErr
  if (!moveOuts || moveOuts.length === 0) return []

  const focusId = moveOuts[0].id

  // Reuse the existing inspection-compare query to get diff rows
  const pair = await getInspectionPair(focusId)
  if (!pair) return []

  const flagged = pair.rows.filter(
    (r) => r.status === 'worse' || r.status === 'new_damage',
  )

  return flagged.map((r) => ({
    category: 'damage' as const,
    description: `Repair: ${r.room} — ${r.item}`,
    amount: 0 as const,
    inspection_item_id: r.move_out_item_id ?? r.move_in_item_id ?? '',
    photos: r.move_out_photos.length > 0 ? r.move_out_photos : r.move_in_photos,
    source_room: r.room,
    source_item: r.item,
    move_in_condition: r.move_in_condition,
    move_out_condition: r.move_out_condition,
  }))
}

// ------------------------------------------------------------
// State return-days lookup for legal deadline
// ------------------------------------------------------------

export async function getStateReturnDays(
  state: string | null,
): Promise<number | null> {
  if (!state) return null
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_rent_rules')
    .select('security_deposit_return_days')
    .eq('state', state.toUpperCase())
    .maybeSingle()

  if (error) return null
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const days = (data as any).security_deposit_return_days
  return typeof days === 'number' ? days : null
}
