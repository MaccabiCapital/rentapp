// ============================================================
// Dashboard → Listings → Syndication
// ============================================================
//
// Landlord control panel for ILS feed syndication. Enables /
// disables the feed, shows the URLs, lists active listings,
// and links to each portal's submission form.

import {
  getMyFeed,
  getMyPortalStatuses,
} from '@/app/lib/queries/syndication'
import {
  PORTAL_DISPLAY_NAMES,
  PORTAL_SUBMISSION_URLS,
} from '@/app/lib/schemas/syndication'
import { SyndicationFeedActions } from '@/app/ui/syndication-feed-actions'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function SyndicationPage() {
  const feed = await getMyFeed()
  const portalStatuses = feed
    ? await getMyPortalStatuses(feed.id)
    : []

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const rentalSourceUrl = feed
    ? `${appUrl}/api/syndication/feed/${feed.feed_token}/rentalsource.xml`
    : ''
  const zillowUrl = feed
    ? `${appUrl}/api/syndication/feed/${feed.feed_token}/zillow.xml`
    : ''

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Listing syndication
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Push your active listings to Zillow, Apartments.com, Realtor.com,
          and 15+ other portals — automatically. One feed, every site.
        </p>
      </div>

      {!feed || !feed.is_active ? (
        <EnableCard hasExistingFeed={!!feed} />
      ) : (
        <>
          <EnabledCard
            rentalSourceUrl={rentalSourceUrl}
            zillowUrl={zillowUrl}
            lastCrawledAt={feed.last_crawled_at}
            totalCrawlCount={feed.total_crawl_count}
          />

          {/* Portal status grid */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
              Portal activity
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(PORTAL_DISPLAY_NAMES)
                .filter(([key]) => key !== 'other')
                .map(([key, name]) => {
                  const status = portalStatuses.find(
                    (s) => s.portal_name === key,
                  )
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {name}
                        </h3>
                        {status ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Not yet
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {status
                          ? `Last crawl ${formatDateTime(status.last_crawled_at)} · ${status.total_crawl_count} total`
                          : 'Submit your feed URL to this portal'}
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>

          {/* Submit-to-portal links */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
              Submit your feed
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Each portal has its own signup. Most accept your feed within
              1–3 business days.
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(PORTAL_SUBMISSION_URLS).map(([key, info]) => (
                <div
                  key={key}
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {info.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-600">
                        {info.instructions}
                      </p>
                    </div>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function EnableCard({ hasExistingFeed }: { hasExistingFeed: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">
        Syndication is off
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        Enable to generate a feed URL you can paste into Zillow, Apartments.com,
        Realtor.com, Zumper, and other portals. Each one crawls the feed
        daily and pulls your active listings automatically — no manual
        re-posting required.
      </p>
      <div className="mt-5">
        <SyndicationFeedActions
          state={hasExistingFeed ? 'disabled' : 'absent'}
        />
      </div>
    </div>
  )
}

function EnabledCard({
  rentalSourceUrl,
  zillowUrl,
  lastCrawledAt,
  totalCrawlCount,
}: {
  rentalSourceUrl: string
  zillowUrl: string
  lastCrawledAt: string | null
  totalCrawlCount: number
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-emerald-900">
            Syndication is live
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            {totalCrawlCount > 0
              ? `Total crawls: ${totalCrawlCount} · Last crawl: ${lastCrawledAt ? new Date(lastCrawledAt).toLocaleString() : '—'}`
              : 'No crawls yet. Submit the URLs below to start syndicating.'}
          </p>
        </div>
        <SyndicationFeedActions state="enabled" />
      </div>

      <div className="mt-6 space-y-4">
        <FeedUrlBlock
          label="Apartments.com / Realtor.com / Zumper / Trulia (RentalSource format)"
          url={rentalSourceUrl}
        />
        <FeedUrlBlock label="Zillow Rental Network" url={zillowUrl} />
      </div>
    </div>
  )
}

function FeedUrlBlock({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-md border border-emerald-300 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
        {label}
      </div>
      <div className="mt-1 break-all rounded border border-emerald-200 bg-emerald-50/50 p-2 font-mono text-xs text-zinc-800">
        {url}
      </div>
    </div>
  )
}
