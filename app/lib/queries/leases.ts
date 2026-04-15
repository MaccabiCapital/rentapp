// ============================================================
// Lease read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { Lease } from '@/app/lib/schemas/lease'
import type { Tenant } from '@/app/lib/schemas/tenant'
import type { Unit } from '@/app/lib/schemas/unit'
import type { Property } from '@/app/lib/schemas/property'

export type LeaseWithTenant = Lease & {
  tenant: Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email'>
}

export type LeaseWithUnit = Lease & {
  unit: Pick<Unit, 'id' | 'unit_number' | 'property_id'> & {
    property: Pick<Property, 'id' | 'name'>
  }
}

// Used by the tenant detail page to show all leases for a tenant.
export async function getLeasesForTenant(
  tenantId: string,
): Promise<LeaseWithUnit[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select(
      '*, unit:units!inner(id, unit_number, property_id, property:properties!inner(id, name))',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as LeaseWithUnit[]
}

// Used by the unit detail page to show the current/most recent lease.
// Sprint 2 assumption: at most one active lease per unit at a time.
// We don't enforce this at the DB level yet — Sprint 3 may add a
// partial-unique index if rent collection reveals a need.
export async function getActiveLeaseForUnit(
  unitId: string,
): Promise<LeaseWithTenant | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select('*, tenant:tenants!inner(id, first_name, last_name, email)')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .in('status', ['active', 'draft'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as LeaseWithTenant | null
}

export async function getLease(id: string): Promise<Lease | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as Lease | null
}

export async function getLeaseWithRelations(
  id: string,
): Promise<
  | (Lease & {
      tenant: Tenant
      unit: Unit & { property: Pick<Property, 'id' | 'name'> }
    })
  | null
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select(
      '*, tenant:tenants!inner(*), unit:units!inner(*, property:properties!inner(id, name))',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? null) as any
}
