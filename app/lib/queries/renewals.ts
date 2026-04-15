// ============================================================
// Renewal-adjacent queries (Sprint 6 gutted)
// ============================================================
//
// "Renewal" isn't a separate table — it's a new lease with
// status=draft that replaces an expiring active lease. The
// queries here surface:
//   - active leases with tenant_notice_given_on set (red bin)
//   - active leases approaching end_date (amber/blue bins)
//   - draft leases tied to the same unit as an expiring lease
//     (so we know a renewal offer has been started)

import { createServerClient } from '@/lib/supabase/server'
import type { Lease } from '@/app/lib/schemas/lease'
import type { Unit } from '@/app/lib/schemas/unit'
import type { Property } from '@/app/lib/schemas/property'
import type { Tenant } from '@/app/lib/schemas/tenant'

export type LeaseWithContext = Lease & {
  unit:
    | (Pick<Unit, 'id' | 'unit_number' | 'property_id'> & {
        property: Pick<Property, 'id' | 'name'>
      })
    | null
  tenant: Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null
}

// 90-day rolling window of active leases, plus anyone who gave notice.
export async function getExpiringLeases(): Promise<LeaseWithContext[]> {
  const supabase = await createServerClient()
  const in90 = new Date()
  in90.setUTCDate(in90.getUTCDate() + 90)

  const { data, error } = await supabase
    .from('leases')
    .select(
      '*, unit:units(id, unit_number, property_id, property:properties(id, name)), tenant:tenants(id, first_name, last_name, email, phone)',
    )
    .is('deleted_at', null)
    .eq('status', 'active')
    .or(
      `end_date.lte.${in90.toISOString().slice(0, 10)},tenant_notice_given_on.not.is.null`,
    )
    .order('end_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as LeaseWithContext[]
}

// Helper so the dashboard can show "N drafts already started"
export async function countDraftLeasesForUnits(
  unitIds: string[],
): Promise<Record<string, number>> {
  if (unitIds.length === 0) return {}
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('leases')
    .select('unit_id')
    .is('deleted_at', null)
    .eq('status', 'draft')
    .in('unit_id', unitIds)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    counts[r.unit_id] = (counts[r.unit_id] ?? 0) + 1
  }
  return counts
}

// Lightweight count for the dashboard overview stat card.
export async function getExpiringLeasesCount(): Promise<{
  total: number
  past_due: number
  tenant_notice: number
}> {
  const supabase = await createServerClient()
  const todayIso = new Date().toISOString().slice(0, 10)
  const in90 = new Date()
  in90.setUTCDate(in90.getUTCDate() + 90)
  const in90Iso = in90.toISOString().slice(0, 10)

  const [{ count: total }, { count: past }, { count: notice }] = await Promise.all([
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active')
      .or(`end_date.lte.${in90Iso},tenant_notice_given_on.not.is.null`),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active')
      .lt('end_date', todayIso),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active')
      .not('tenant_notice_given_on', 'is', null),
  ])

  return {
    total: total ?? 0,
    past_due: past ?? 0,
    tenant_notice: notice ?? 0,
  }
}
