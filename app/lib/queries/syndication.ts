// ============================================================
// Syndication queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import type {
  SyndicationFeed,
  SyndicationPortalStatus,
} from '@/app/lib/schemas/syndication'

export async function getMyFeed(): Promise<SyndicationFeed | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('syndication_feeds')
    .select('*')
    .maybeSingle()
  return (data ?? null) as SyndicationFeed | null
}

export async function getMyPortalStatuses(
  feedId: string,
): Promise<SyndicationPortalStatus[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('syndication_portal_status')
    .select('*')
    .eq('feed_id', feedId)
    .order('last_crawled_at', { ascending: false, nullsFirst: false })
  return (data ?? []) as SyndicationPortalStatus[]
}

// Public feed lookup — no auth, token IS the credential. Service-role
// bypasses RLS so the aggregator can hit the feed.
export async function getFeedByToken(
  token: string,
): Promise<SyndicationFeed | null> {
  if (!token || token.length < 16) return null
  const supabase = getServiceRoleClient()
  const { data } = await supabase
    .from('syndication_feeds')
    .select('*')
    .eq('feed_token', token)
    .eq('is_active', true)
    .maybeSingle()
  return (data ?? null) as SyndicationFeed | null
}

// Listings to syndicate: active, not deleted, with property + unit
// joined for the XML output. Service-role because the feed itself is
// unauthenticated.
export async function getSyndicableListings(
  ownerId: string,
): Promise<
  Array<{
    id: string
    slug: string
    title: string
    description: string | null
    headline_rent: number | null
    available_on: string | null
    contact_email: string | null
    contact_phone: string | null
    property: {
      id: string
      name: string
      street_address: string
      city: string
      state: string
      postal_code: string
      photos: string[] | null
    }
    unit: {
      id: string
      unit_number: string | null
      bedrooms: number | null
      bathrooms: number | null
      square_feet: number | null
      photos: string[] | null
    } | null
  }>
> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('listings')
    .select(
      '*, property:properties!inner(id, name, street_address, city, state, postal_code, photos), unit:units(id, unit_number, bedrooms, bathrooms, square_feet, photos)',
    )
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any
}

// Service-role recorder — called from the public feed route to track
// each crawl + update per-portal status.
export async function recordFeedCrawl(opts: {
  feedId: string
  portalName: string
  userAgent: string | null
}): Promise<void> {
  const supabase = getServiceRoleClient()
  const now = new Date().toISOString()

  // Bump aggregate counter on the feed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feed } = await (supabase as any)
    .from('syndication_feeds')
    .select('total_crawl_count')
    .eq('id', opts.feedId)
    .single()
  const newCount = ((feed?.total_crawl_count as number) ?? 0) + 1
  await supabase
    .from('syndication_feeds')
    .update({
      last_crawled_at: now,
      last_crawled_user_agent: opts.userAgent,
      total_crawl_count: newCount,
    })
    .eq('id', opts.feedId)

  // Upsert per-portal row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('syndication_portal_status')
    .select('id, total_crawl_count')
    .eq('feed_id', opts.feedId)
    .eq('portal_name', opts.portalName)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('syndication_portal_status')
      .update({
        last_crawled_at: now,
        total_crawl_count: ((existing.total_crawl_count as number) ?? 0) + 1,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('syndication_portal_status').insert({
      feed_id: opts.feedId,
      portal_name: opts.portalName,
      last_crawled_at: now,
      total_crawl_count: 1,
    })
  }
}
