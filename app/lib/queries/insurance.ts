// ============================================================
// Insurance policy read queries
// ============================================================
//
// Each policy can cover 1..N properties via the policy_properties
// junction. Every public query hydrates the properties array so
// the UI always has a consistent shape.

import { createServerClient } from '@/lib/supabase/server'
import type {
  InsurancePolicy,
  InsurancePolicyWithProperties,
} from '@/app/lib/schemas/insurance'

type JunctionRow = {
  property_id: string
  property: { id: string; name: string } | null
}

async function hydrateProperties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  policyIds: string[],
): Promise<Map<string, Array<{ id: string; name: string }>>> {
  const map = new Map<string, Array<{ id: string; name: string }>>()
  if (policyIds.length === 0) return map

  const { data, error } = await supabase
    .from('policy_properties')
    .select('policy_id, property_id, property:properties(id, name)')
    .in('policy_id', policyIds)

  if (error) throw error

  for (const row of (data ?? []) as Array<
    JunctionRow & { policy_id: string }
  >) {
    const existing = map.get(row.policy_id) ?? []
    if (row.property) {
      existing.push({ id: row.property.id, name: row.property.name })
    } else {
      existing.push({ id: row.property_id, name: 'Unknown property' })
    }
    map.set(row.policy_id, existing)
  }

  return map
}

export async function getInsurancePolicies(): Promise<
  InsurancePolicyWithProperties[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as InsurancePolicy[]
  const propertyMap = await hydrateProperties(
    supabase,
    rows.map((r) => r.id),
  )

  return rows.map((r) => ({
    ...r,
    properties: propertyMap.get(r.id) ?? [],
  }))
}

export async function getInsurancePolicy(
  id: string,
): Promise<InsurancePolicyWithProperties | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const policy = data as InsurancePolicy
  const propertyMap = await hydrateProperties(supabase, [policy.id])
  return { ...policy, properties: propertyMap.get(policy.id) ?? [] }
}

// Used by the property detail page to show "insured under" badges.
export async function getInsurancePoliciesForProperty(
  propertyId: string,
): Promise<InsurancePolicyWithProperties[]> {
  const supabase = await createServerClient()

  const { data: junctionRows, error: jErr } = await supabase
    .from('policy_properties')
    .select('policy_id')
    .eq('property_id', propertyId)
  if (jErr) throw jErr

  const policyIds = Array.from(
    new Set(
      (junctionRows ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.policy_id as string,
      ),
    ),
  )
  if (policyIds.length === 0) return []

  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .in('id', policyIds)
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as InsurancePolicy[]
  const propertyMap = await hydrateProperties(
    supabase,
    rows.map((r) => r.id),
  )
  return rows.map((r) => ({
    ...r,
    properties: propertyMap.get(r.id) ?? [],
  }))
}

// Lightweight shape for the dashboard stat card.
export async function getInsuranceSummary(): Promise<{
  total: number
  expiringSoon: number // next 60 days, not yet expired
  expired: number
}> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('id, expiry_date')
    .is('deleted_at', null)
  if (error) throw error

  const now = Date.now()
  const in60 = now + 60 * 24 * 60 * 60 * 1000
  let total = 0
  let expiringSoon = 0
  let expired = 0
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    total += 1
    const ms = new Date(r.expiry_date).getTime()
    if (ms < now) expired += 1
    else if (ms <= in60) expiringSoon += 1
  }
  return { total, expiringSoon, expired }
}
