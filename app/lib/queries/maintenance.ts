// ============================================================
// Maintenance read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { MaintenanceRequest } from '@/app/lib/schemas/maintenance'
import type { Unit } from '@/app/lib/schemas/unit'
import type { Property } from '@/app/lib/schemas/property'
import type { Tenant } from '@/app/lib/schemas/tenant'

// The global rent-roll-style query for /dashboard/maintenance.
// Joins unit → property so the landlord sees where the issue is
// without jumping pages. Tenant is optional.
export type MaintenanceWithContext = MaintenanceRequest & {
  unit: Pick<Unit, 'id' | 'unit_number' | 'property_id'> & {
    property: Pick<Property, 'id' | 'name'>
  }
  tenant: Pick<Tenant, 'id' | 'first_name' | 'last_name'> | null
}

export async function getMaintenanceRequests(): Promise<
  MaintenanceWithContext[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(
      '*, unit:units!inner(id, unit_number, property_id, property:properties!inner(id, name)), tenant:tenants(id, first_name, last_name)',
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MaintenanceWithContext[]
}

export async function getMaintenanceRequest(
  id: string,
): Promise<MaintenanceWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(
      '*, unit:units!inner(id, unit_number, property_id, property:properties!inner(id, name)), tenant:tenants(id, first_name, last_name)',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as MaintenanceWithContext | null
}

// Per-unit maintenance history shown on the unit detail page.
export async function getMaintenanceForUnit(
  unitId: string,
): Promise<MaintenanceRequest[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return (data ?? []) as MaintenanceRequest[]
}
