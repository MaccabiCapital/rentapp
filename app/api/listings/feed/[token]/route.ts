// ============================================================
// Public listing syndication feed (ILS/Zillow-compatible XML)
// ============================================================
//
// GET /api/listings/feed/[token]/route.xml
//
// Zillow Rental Manager accepts an ILS-format XML feed of
// listings. This endpoint outputs the Rentbase landlord's
// active listings in that format. The token scopes the feed
// to one landlord — same landlord, same token, every request.
//
// Uses the service-role client because the visitor is
// anonymous (this is a public feed URL Zillow crawls).

import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

function xmlEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token || token.length < 10) {
    return new NextResponse('Not found', { status: 404 })
  }

  const supabase = getServiceRoleClient()

  // Resolve token → owner
  const { data: settings } = await supabase
    .from('landlord_settings')
    .select('owner_id')
    .eq('listings_feed_token', token)
    .maybeSingle()

  if (!settings) {
    return new NextResponse('Feed not found', { status: 404 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (settings as any).owner_id as string

  // Pull all active listings for this owner with unit + property
  const { data: listings } = await supabase
    .from('listings')
    .select(
      `id, slug, title, description, headline_rent, available_on,
       contact_email, contact_phone, created_at, updated_at,
       property:properties (
         name, street_address, city, state, postal_code, country
       ),
       unit:units ( unit_number, bedrooms, bathrooms, square_feet )`,
    )
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .is('deleted_at', null)

  const origin = new URL(request.url).origin
  const now = new Date().toISOString()

  const entries = ((listings ?? []) as unknown as Array<{
    id: string
    slug: string
    title: string
    description: string | null
    headline_rent: number | null
    available_on: string | null
    contact_email: string | null
    contact_phone: string | null
    created_at: string
    updated_at: string
    property: {
      name: string
      street_address: string
      city: string
      state: string
      postal_code: string
      country: string | null
    } | null
    unit: {
      unit_number: string | null
      bedrooms: number | null
      bathrooms: number | null
      square_feet: number | null
    } | null
  }>)
    .map((l) => {
      const publicUrl = `${origin}/listings/${l.slug}`
      const addr = l.property
        ? `${l.property.street_address}, ${l.property.city}, ${l.property.state} ${l.property.postal_code}`
        : ''
      return `  <Property>
    <PropertyID>${xmlEscape(l.id)}</PropertyID>
    <Title>${xmlEscape(l.title)}</Title>
    <Description>${xmlEscape(l.description ?? '')}</Description>
    <UnitNumber>${xmlEscape(l.unit?.unit_number ?? '')}</UnitNumber>
    <Address>${xmlEscape(l.property?.street_address ?? '')}</Address>
    <City>${xmlEscape(l.property?.city ?? '')}</City>
    <State>${xmlEscape(l.property?.state ?? '')}</State>
    <Zip>${xmlEscape(l.property?.postal_code ?? '')}</Zip>
    <Country>${xmlEscape(l.property?.country ?? 'US')}</Country>
    <Bedrooms>${l.unit?.bedrooms ?? ''}</Bedrooms>
    <Bathrooms>${l.unit?.bathrooms ?? ''}</Bathrooms>
    <SquareFeet>${l.unit?.square_feet ?? ''}</SquareFeet>
    <Rent>${l.headline_rent ?? ''}</Rent>
    <AvailableDate>${xmlEscape(l.available_on ?? '')}</AvailableDate>
    <ContactEmail>${xmlEscape(l.contact_email ?? '')}</ContactEmail>
    <ContactPhone>${xmlEscape(l.contact_phone ?? '')}</ContactPhone>
    <ListingUrl>${xmlEscape(publicUrl)}</ListingUrl>
    <DateListed>${xmlEscape(l.created_at)}</DateListed>
    <DateUpdated>${xmlEscape(l.updated_at)}</DateUpdated>
    <FullAddress>${xmlEscape(addr)}</FullAddress>
  </Property>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ILSFeed generated="${xmlEscape(now)}" source="Rentapp">
${entries}
</ILSFeed>
`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  })
}
