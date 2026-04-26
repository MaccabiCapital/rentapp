// ============================================================
// Public rental application page
// ============================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublicListingBySlug } from '@/app/lib/queries/public-listing'
import { ApplicationForm } from '@/app/ui/application-form'
import { ApplicationFaqBot } from '@/app/ui/application-faq-bot'

function formatCurrency(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return 'Immediately'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const listing = await getPublicListingBySlug(slug)
  if (!listing) notFound()

  const address = [listing.street_address, listing.city, listing.state]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href={`/listings/${slug}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to listing
          </Link>
          <span className="text-xs text-zinc-500">
            Rental application · {listing.company_name ?? 'Rentapp'}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Apply for {listing.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {address}
            {listing.postal_code ? ` ${listing.postal_code}` : ''}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Monthly rent"
              value={formatCurrency(listing.headline_rent)}
            />
            <Stat
              label="Available"
              value={formatDate(listing.available_on)}
            />
            {listing.bedrooms !== null && (
              <Stat
                label="Bedrooms"
                value={listing.bedrooms.toString()}
              />
            )}
            {listing.bathrooms !== null && (
              <Stat
                label="Bathrooms"
                value={listing.bathrooms.toString()}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <ApplicationForm slug={slug} petPolicy={listing.pet_policy} />
          </div>
          <div>
            <ApplicationFaqBot />
          </div>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">
        {value}
      </div>
    </div>
  )
}
