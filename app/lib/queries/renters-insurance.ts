// ============================================================
// Renters insurance read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { RentersInsurancePolicy } from '@/app/lib/schemas/renters-insurance'

export type RentersInsuranceWithContext = RentersInsurancePolicy & {
  tenant: {
    id: string
    first_name: string
    last_name: string
  } | null
  lease: {
    id: string
    start_date: string
    end_date: string
    unit: {
      unit_number: string | null
      property: { name: string } | null
    } | null
  } | null
}

const LEASE_CTX = `
  id,
  start_date,
  end_date,
  unit:units ( unit_number, property:properties ( name ) )
`

export async function getRentersInsurancePolicies(): Promise<
  RentersInsuranceWithContext[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('renters_insurance_policies')
    .select(
      `*,
      tenant:tenants ( id, first_name, last_name ),
      lease:leases ( ${LEASE_CTX} )`,
    )
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as RentersInsuranceWithContext[]
}

export async function getRentersInsurancePolicy(
  id: string,
): Promise<RentersInsuranceWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('renters_insurance_policies')
    .select(
      `*,
      tenant:tenants ( id, first_name, last_name ),
      lease:leases ( ${LEASE_CTX} )`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return data as RentersInsuranceWithContext
}

// Pick the most recent (by expiry) non-deleted policy for a tenant.
export async function getCurrentRentersInsuranceForTenant(
  tenantId: string,
): Promise<RentersInsurancePolicy | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('renters_insurance_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('expiry_date', { ascending: false })
    .limit(1)

  if (error) throw error
  if (!data || data.length === 0) return null
  return data[0] as RentersInsurancePolicy
}

// Lightweight picker list — tenants with active leases.
export type TenantPickerRow = {
  id: string
  first_name: string
  last_name: string
  current_lease_id: string | null
  current_property_name: string | null
  current_unit_label: string | null
}

export async function getTenantsForInsurancePicker(): Promise<
  TenantPickerRow[]
> {
  const supabase = await createServerClient()
  // Fetch all non-deleted tenants + their most recent active lease
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id, first_name, last_name')
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
  if (tErr) throw tErr

  // Fetch active leases per tenant with unit + property context
  const { data: leases, error: lErr } = await supabase
    .from('leases')
    .select(
      `id, tenant_id, status,
      unit:units ( unit_number, property:properties ( name ) )`,
    )
    .is('deleted_at', null)
    .in('status', ['active', 'draft', 'renewed'])
    .order('created_at', { ascending: false })
  if (lErr) throw lErr

  // Map latest lease per tenant
  const leaseByTenant = new Map<
    string,
    {
      id: string
      property_name: string | null
      unit_label: string | null
    }
  >()
  for (const rawRow of leases ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = rawRow as any
    if (leaseByTenant.has(row.tenant_id)) continue
    leaseByTenant.set(row.tenant_id, {
      id: row.id,
      property_name: row.unit?.property?.name ?? null,
      unit_label: row.unit?.unit_number ?? null,
    })
  }

  return (tenants ?? []).map(
    (t: { id: string; first_name: string; last_name: string }) => {
      const lease = leaseByTenant.get(t.id)
      return {
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        current_lease_id: lease?.id ?? null,
        current_property_name: lease?.property_name ?? null,
        current_unit_label: lease?.unit_label ?? null,
      }
    },
  )
}

// Dashboard summary stats
export async function getRentersInsuranceSummary(): Promise<{
  total: number
  expired: number
  expiringSoon: number
  leasesRequiring: number
  leasesRequiringWithoutPolicy: number
}> {
  const supabase = await createServerClient()
  const { data: policies, error: pErr } = await supabase
    .from('renters_insurance_policies')
    .select('id, tenant_id, expiry_date')
    .is('deleted_at', null)
  if (pErr) throw pErr

  const now = Date.now()
  const in30 = now + 30 * 24 * 60 * 60 * 1000
  let total = 0
  let expired = 0
  let expiringSoon = 0
  const coveredTenants = new Set<string>()
  for (const row of policies ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    total += 1
    const ms = new Date(r.expiry_date).getTime()
    if (ms < now) expired += 1
    else if (ms <= in30) expiringSoon += 1
    // Count as covered if there's at least one non-expired policy
    if (ms >= now) coveredTenants.add(r.tenant_id)
  }

  const { data: leasesReq, error: lErr } = await supabase
    .from('leases')
    .select('tenant_id, status, requires_renters_insurance')
    .is('deleted_at', null)
    .eq('status', 'active')
    .eq('requires_renters_insurance', true)
  if (lErr) throw lErr

  const leasesRequiring = (leasesReq ?? []).length
  const leasesRequiringWithoutPolicy = (
    (leasesReq ?? []) as Array<{ tenant_id: string }>
  ).filter((l) => !coveredTenants.has(l.tenant_id)).length

  return {
    total,
    expired,
    expiringSoon,
    leasesRequiring,
    leasesRequiringWithoutPolicy,
  }
}
