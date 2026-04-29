// ============================================================
// Syndication feed validation
// ============================================================
//
// Round-trip test: enable a feed, hit both XML routes, assert
// well-formedness + required ILS fields. Catches schema
// regressions that would silently break Zillow / Apartments.com
// crawls in production.

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

const TEST_TOKEN = 'feedtoken_e2e_validation_test_xyz'
const OWNER_ID =
  process.env.SMOKE_OWNER_ID ?? 'a8c734a9-04d2-4a89-90a0-6043ef6709ab'

async function ensureTestFeed(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not loaded')
  const sb = createClient(url, key)
  // Upsert by owner_id so we don't pile up rows on re-runs.
  await sb
    .from('syndication_feeds')
    .upsert(
      {
        owner_id: OWNER_ID,
        feed_token: TEST_TOKEN,
        is_active: true,
      },
      { onConflict: 'owner_id' },
    )
}

async function activeListingCount(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sb = createClient(url, key)
  const { count } = await sb
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', OWNER_ID)
    .eq('is_active', true)
    .is('deleted_at', null)
  return count ?? 0
}

test('syndication feeds produce well-formed ILS XML', async ({ request }) => {
  await ensureTestFeed()
  const expectedCount = await activeListingCount()
  console.log(`  active listings expected in feed: ${expectedCount}`)

  // ---- RentalSource format ----
  const rs = await request.get(
    `/api/syndication/feed/${TEST_TOKEN}/rentalsource.xml`,
  )
  expect(rs.status()).toBe(200)
  expect(rs.headers()['content-type']).toContain('application/xml')
  const rsXml = await rs.text()
  expect(rsXml.startsWith('<?xml')).toBeTruthy()
  expect(rsXml).toContain('<PhysicalProperty')
  expect(rsXml).toContain('<Management>')

  // Property count matches active listings
  const rsPropertyCount = (rsXml.match(/<Property>/g) ?? []).length
  expect(rsPropertyCount).toBe(expectedCount)

  if (expectedCount > 0) {
    // Required per-property fields exist for each entry
    expect((rsXml.match(/<MarketingName>/g) ?? []).length).toBeGreaterThanOrEqual(
      expectedCount,
    )
    expect((rsXml.match(/<Address AddressType="property">/g) ?? []).length).toBe(
      expectedCount,
    )
    expect((rsXml.match(/<UnitBedrooms>/g) ?? []).length).toBe(expectedCount)
    expect((rsXml.match(/<UnitRent>/g) ?? []).length).toBe(expectedCount)
  }

  // ---- Zillow format ----
  const zillow = await request.get(
    `/api/syndication/feed/${TEST_TOKEN}/zillow.xml`,
  )
  expect(zillow.status()).toBe(200)
  expect(zillow.headers()['content-type']).toContain('application/xml')
  const zXml = await zillow.text()
  expect(zXml.startsWith('<?xml')).toBeTruthy()
  expect(zXml).toContain('<Listings>')
  expect(zXml).toContain('<SiteInfo>')

  const zListingCount = (zXml.match(/<Listing>/g) ?? []).length
  expect(zListingCount).toBe(expectedCount)

  if (expectedCount > 0) {
    expect((zXml.match(/<ListingId>/g) ?? []).length).toBe(expectedCount)
    expect((zXml.match(/<Title>/g) ?? []).length).toBe(expectedCount)
    expect((zXml.match(/<Bedrooms>/g) ?? []).length).toBe(expectedCount)
    expect((zXml.match(/<Bathrooms>/g) ?? []).length).toBe(expectedCount)
    expect((zXml.match(/<Rent>/g) ?? []).length).toBe(expectedCount)
  }

  // ---- Bad token returns 404 ----
  const bad = await request.get(
    '/api/syndication/feed/this-token-does-not-exist/rentalsource.xml',
  )
  expect(bad.status()).toBe(404)
})
