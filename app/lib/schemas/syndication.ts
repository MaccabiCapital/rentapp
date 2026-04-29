// ============================================================
// Syndication feed schemas
// ============================================================

export type SyndicationFeed = {
  id: string
  owner_id: string
  feed_token: string
  is_active: boolean
  last_crawled_at: string | null
  last_crawled_user_agent: string | null
  total_crawl_count: number
  created_at: string
  updated_at: string
}

export type SyndicationPortalStatus = {
  id: string
  feed_id: string
  portal_name: string
  last_crawled_at: string | null
  total_crawl_count: number
  created_at: string
  updated_at: string
}

// Map an inbound user agent to a portal name. Best-effort heuristic
// based on published crawler signatures. Unknown agents go to 'other'
// so we still record the crawl without losing data.
export function detectPortalFromUserAgent(ua: string | null): string {
  if (!ua) return 'other'
  const u = ua.toLowerCase()
  if (u.includes('zillow')) return 'zillow'
  if (u.includes('apartments') || u.includes('costar')) return 'apartments_com'
  if (u.includes('realtor')) return 'realtor_com'
  if (u.includes('rent.com') || u.includes('rentcom')) return 'rent_com'
  if (u.includes('zumper')) return 'zumper'
  if (u.includes('trulia')) return 'trulia'
  if (u.includes('rentcafe')) return 'rentcafe'
  if (u.includes('hotpads')) return 'hotpads'
  return 'other'
}

export const PORTAL_DISPLAY_NAMES: Record<string, string> = {
  zillow: 'Zillow',
  apartments_com: 'Apartments.com',
  realtor_com: 'Realtor.com',
  rent_com: 'Rent.com',
  zumper: 'Zumper',
  trulia: 'Trulia',
  rentcafe: 'RentCafé',
  hotpads: 'HotPads',
  other: 'Other crawler',
}

export const PORTAL_SUBMISSION_URLS: Record<
  string,
  { name: string; url: string; instructions: string }
> = {
  zillow: {
    name: 'Zillow Rental Network',
    url: 'https://www.zillow.com/rental-manager/feeds/',
    instructions:
      'Sign up for Zillow Rental Network → Feeds → Submit your XML URL. Approval typically takes 1–3 business days.',
  },
  apartments_com: {
    name: 'Apartments.com',
    url: 'https://www.apartments.com/feedmanager/',
    instructions:
      'Apartments.com Partner Portal → Feed Manager → Add new feed. Uses the standard ILS RentalSource format.',
  },
  realtor_com: {
    name: 'Realtor.com',
    url: 'https://www.realtor.com/marketing/rentals',
    instructions:
      'Realtor.com Rentals partner program → Submit feed URL. Same RentalSource XML format as Apartments.com.',
  },
  rent_com: {
    name: 'Rent.com',
    url: 'https://www.rent.com/rentals/post-listings',
    instructions:
      'Rent.com is part of the Apartments.com network — the same Apartments.com feed automatically syndicates here.',
  },
  zumper: {
    name: 'Zumper',
    url: 'https://www.zumper.com/post-rentals',
    instructions:
      'Zumper accepts ILS feeds. Email partners@zumper.com with your feed URL.',
  },
  trulia: {
    name: 'Trulia',
    url: 'https://www.trulia.com/rental_listings/',
    instructions:
      'Trulia is part of the Zillow network — the same Zillow feed automatically syndicates here.',
  },
}
