// ============================================================
// Listing queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { Listing } from '@/app/lib/schemas/listing'
import type { Property } from '@/app/lib/schemas/property'
import type { Unit } from '@/app/lib/schemas/unit'

export type ListingWithContext = Listing & {
  property: Pick<Property, 'id' | 'name' | 'street_address' | 'city' | 'state' | 'postal_code' | 'photos'>
  unit:
    | (Pick<Unit, 'id' | 'unit_number' | 'bedrooms' | 'bathrooms' | 'square_feet' | 'photos'>)
    | null
}

// Landlord-side: all of their listings
export async function getListingsByOwner(): Promise<ListingWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, property:properties!inner(id, name, street_address, city, state, postal_code, photos), unit:units(id, unit_number, bedrooms, bathrooms, square_feet, photos)',
    )
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ListingWithContext[]
}

export async function getListing(
  id: string,
): Promise<ListingWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, property:properties!inner(id, name, street_address, city, state, postal_code, photos), unit:units(id, unit_number, bedrooms, bathrooms, square_feet, photos)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as ListingWithContext | null
}

// Public page: anyone can fetch a listing by slug if it's active.
// RLS policy "public can select active listings" handles isolation.
export async function getListingBySlug(
  slug: string,
): Promise<ListingWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, property:properties(id, name, street_address, city, state, postal_code, photos), unit:units(id, unit_number, bedrooms, bathrooms, square_feet, photos)',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as ListingWithContext | null
}

// Helper for the listing form — fetch the landlord's properties
// with their active units nested, for the property/unit picker.
export async function getPropertiesWithUnitsForListingForm(): Promise<
  Array<{
    id: string
    name: string
    units: Array<{ id: string; unit_number: string | null; status: string }>
  }>
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, units(id, unit_number, status, deleted_at)')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    return {
      id: r.id,
      name: r.name,
      units: ((r.units as Array<{
        id: string
        unit_number: string | null
        status: string
        deleted_at: string | null
      }>) ?? [])
        .filter((u) => u.deleted_at === null)
        .map((u) => ({
          id: u.id,
          unit_number: u.unit_number,
          status: u.status,
        })),
    }
  })
}

// Dashboard overview stat: how many active listings + total views
export async function getListingsSummary(): Promise<{
  active_count: number
  total_views: number
  total_inquiries: number
}> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('listings')
    .select('is_active, view_count, inquiry_count')
    .is('deleted_at', null)

  if (error) throw error
  const rows = data ?? []
  return {
    active_count: rows.filter((r) => r.is_active).length,
    total_views: rows.reduce((s, r) => s + (r.view_count ?? 0), 0),
    total_inquiries: rows.reduce((s, r) => s + (r.inquiry_count ?? 0), 0),
  }
}
