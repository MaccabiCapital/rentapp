// ============================================================
// Public listing page — /listings/[slug]
// ============================================================
//
// No auth required. Renders a marketing-quality page showing
// the property, unit details, photos, and a contact form.
// Submitting the form creates a prospect in the landlord's
// CRM via service role (see app/actions/listings.ts).

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getListingBySlug } from '@/app/lib/queries/listings'
import { incrementListingView } from '@/app/actions/listings'
import { resolvePhotoUrls } from '@/app/lib/storage/photos'
import { InquiryForm } from '@/app/ui/inquiry-form'

function formatCurrency(value: number | null) {
  if (value === null) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Dynamic SEO metadata per listing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) {
    return {
      title: 'Listing not found',
    }
  }
  const location = `${listing.property.city}, ${listing.property.state}`
  return {
    title: `${listing.title} — ${location}`,
    description:
      listing.description ??
      `${listing.title} in ${location}. Contact the landlord for details.`,
    openGraph: {
      title: listing.title,
      description: listing.description ?? undefined,
      type: 'website',
    },
  }
}

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) notFound()

  // Fire-and-forget view counter bump. We don't await this so
  // the page render isn't blocked on the counter write.
  incrementListingView(slug).catch(() => {
    /* ignore */
  })

  // Resolve all photo paths to signed URLs
  const allPhotoPaths = [
    ...(listing.unit?.photos ?? []),
    ...(listing.property.photos ?? []),
  ]
  const photoUrls = await resolvePhotoUrls(allPhotoPaths)
  const resolvedPhotos = allPhotoPaths
    .map((path) => photoUrls[path])
    .filter((url): url is string => Boolean(url))

  const headlineRent = formatCurrency(listing.headline_rent)
  const availableOn = formatDate(listing.available_on)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <p className="text-sm font-semibold text-indigo-600">Rentbase</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* ---- Left column: listing content ---- */}
          <div>
            {/* Hero photo */}
            {resolvedPhotos.length > 0 && (
              <div className="mb-6 overflow-hidden rounded-xl bg-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedPhotos[0]}
                  alt={listing.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            )}

            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-2 text-base text-zinc-600">
              {listing.property.street_address}, {listing.property.city},{' '}
              {listing.property.state} {listing.property.postal_code}
            </p>

            {/* Key stats */}
            <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg border border-zinc-200 bg-white p-5">
              {headlineRent && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Monthly rent
                  </div>
                  <div className="mt-0.5 text-2xl font-semibold text-indigo-600">
                    {headlineRent}
                  </div>
                </div>
              )}
              {listing.unit && (
                <>
                  {listing.unit.bedrooms !== null && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Bedrooms
                      </div>
                      <div className="mt-0.5 text-2xl font-semibold text-zinc-900">
                        {listing.unit.bedrooms}
                      </div>
                    </div>
                  )}
                  {listing.unit.bathrooms !== null && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Bathrooms
                      </div>
                      <div className="mt-0.5 text-2xl font-semibold text-zinc-900">
                        {listing.unit.bathrooms}
                      </div>
                    </div>
                  )}
                  {listing.unit.square_feet !== null && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Sq ft
                      </div>
                      <div className="mt-0.5 text-2xl font-semibold text-zinc-900">
                        {listing.unit.square_feet}
                      </div>
                    </div>
                  )}
                </>
              )}
              {availableOn && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Available
                  </div>
                  <div className="mt-0.5 text-2xl font-semibold text-zinc-900">
                    {availableOn}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-900">About this place</h2>
                <div className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
                  {listing.description}
                </div>
              </div>
            )}

            {/* Photo grid (excluding the hero) */}
            {resolvedPhotos.length > 1 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-900">Photos</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {resolvedPhotos.slice(1).map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-square overflow-hidden rounded-lg bg-zinc-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- Right column: contact form ---- */}
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Interested? Contact the landlord.
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                They&rsquo;ll see your message in their dashboard and get back to you.
              </p>
              <div className="mt-5">
                <InquiryForm slug={listing.slug} turnstileSiteKey={siteKey} />
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-zinc-500">
          Powered by Rentbase
        </div>
      </footer>
    </div>
  )
}
