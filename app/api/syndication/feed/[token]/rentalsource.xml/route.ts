// ============================================================
// RentalSource ILS feed (Apartments.com / Realtor.com / Zumper)
// ============================================================
//
// Public, unauthenticated. Token IS the credential. Aggregators
// crawl this URL daily; we record each crawl in syndication
// tracking tables.

import { NextResponse } from 'next/server'
import {
  getFeedByToken,
  getSyndicableListings,
  recordFeedCrawl,
} from '@/app/lib/queries/syndication'
import { detectPortalFromUserAgent } from '@/app/lib/schemas/syndication'
import { buildRentalSourceFeed } from '@/app/lib/syndication/xml-builders'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const feed = await getFeedByToken(token)
  if (!feed) {
    return new NextResponse('Feed not found', { status: 404 })
  }

  const listings = await getSyndicableListings(feed.owner_id)

  // Resolve a display name for the Management block. Fall back to
  // the email if no company profile is set.
  let ownerName = 'Rentbase Landlord'
  const supabase = getServiceRoleClient()
  const { data: profile } = await supabase
    .from('landlord_settings')
    .select('company_name')
    .eq('owner_id', feed.owner_id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((profile as any)?.company_name) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ownerName = (profile as any).company_name
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const xml = buildRentalSourceFeed({ listings, appUrl, ownerName })

  // Record the crawl asynchronously so we don't block the response.
  // (We await for now since the feed query is small and this keeps
  // the route deterministic for the smoke spec.)
  const ua = request.headers.get('user-agent')
  await recordFeedCrawl({
    feedId: feed.id,
    portalName: detectPortalFromUserAgent(ua),
    userAgent: ua,
  })

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 min — aggregators re-crawl frequently
    },
  })
}
