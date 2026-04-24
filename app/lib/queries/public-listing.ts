// ============================================================
// Public listing query — used by /apply/[slug]
// ============================================================

import { getServiceRoleClient } from '@/lib/supabase/service-role'

export type PublicListing = {
  id: string
  slug: string
  title: string
  description: string | null
  headline_rent: number | null
  available_on: string | null
  property_name: string | null
  street_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
}

export async function getPublicListingBySlug(
  slug: string,
): Promise<PublicListing | null> {
  if (!slug) return null
  const supabase = getServiceRoleClient()
  const { data } = await supabase
    .from('listings')
    .select(
      `id, slug, title, description, headline_rent, available_on,
       property:properties ( name, street_address, city, state, postal_code ),
       unit:units ( bedrooms, bathrooms, square_feet )`,
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description ?? null,
    headline_rent: r.headline_rent === null ? null : Number(r.headline_rent),
    available_on: r.available_on ?? null,
    property_name: r.property?.name ?? null,
    street_address: r.property?.street_address ?? null,
    city: r.property?.city ?? null,
    state: r.property?.state ?? null,
    postal_code: r.property?.postal_code ?? null,
    bedrooms: r.unit?.bedrooms ?? null,
    bathrooms: r.unit?.bathrooms === null ? null : Number(r.unit?.bathrooms),
    square_feet: r.unit?.square_feet ?? null,
  }
}
