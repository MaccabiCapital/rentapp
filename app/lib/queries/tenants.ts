// ============================================================
// Tenant read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { Tenant } from '@/app/lib/schemas/tenant'

export async function getTenants(): Promise<Tenant[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Tenant[]
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as Tenant | null
}

// Used by the "Add lease" flow from the unit detail page, so the
// landlord can pick an existing tenant without reopening the
// tenants module.
export async function getTenantsForPicker(): Promise<
  Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email'>[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, email')
    .is('deleted_at', null)
    .order('last_name', { ascending: true })

  if (error) throw error
  return data ?? []
}
