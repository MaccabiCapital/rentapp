// ============================================================
// Unit read queries
// ============================================================
//
// `getAllUnitsWithProperty` is the rent-roll query. It uses a
// PostgREST !inner join so only units belonging to a non-deleted
// property are returned, plus the nested filter on
// `properties.deleted_at` (which PostgREST accepts on embedded tables).
//
// Verified against live Supabase on 2026-04-15.

import { createServerClient } from '@/lib/supabase/server'
import type { Unit } from '@/app/lib/schemas/unit'
import type { Property } from '@/app/lib/schemas/property'

export async function getUnitsForProperty(
  propertyId: string,
): Promise<Unit[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('unit_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as Unit[]
}

export async function getUnit(
  unitId: string,
  propertyId: string,
): Promise<Unit | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as Unit | null
}

// Rent-roll row: a Unit joined to a minimal view of its property.
export type UnitWithProperty = Unit & {
  property: Pick<Property, 'id' | 'name'>
}

export async function getAllUnitsWithProperty(): Promise<UnitWithProperty[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('units')
    .select('*, property:properties!inner(id, name)')
    .is('deleted_at', null)
    .is('properties.deleted_at', null)
    .order('property_id', { ascending: true })
    .order('unit_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as UnitWithProperty[]
}

// Used by deleteProperty to enforce the "no active units" guard
// without pulling every unit into memory.
export async function countActiveUnitsForProperty(
  propertyId: string,
): Promise<number> {
  const supabase = await createServerClient()
  const { count, error } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .is('deleted_at', null)

  if (error) throw error
  return count ?? 0
}
