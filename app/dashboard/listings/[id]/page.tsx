// ============================================================
// Dashboard → Listings → [id] → detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getListing } from '@/app/lib/queries/listings'
import { ListingShare } from '@/app/ui/listing-share'
import { ListingToggleButton } from '@/app/ui/listing-toggle-button'
import { DeleteListingButton } from '@/app/ui/delete-listing-button'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/listings" className="hover:text-zinc-900">
          Listings
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{listing.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {listing.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {listing.property.name}
            {listing.unit?.unit_number ? ` · ${listing.unit.unit_number}` : ''}
            {' · '}
            {listing.property.city}, {listing.property.state}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {listing.is_active ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Inactive
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <a
              href={`/listings/${listing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Preview public page
            </a>
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </Link>
          </div>
          <ListingToggleButton
            listingId={listing.id}
            isActive={listing.is_active}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Views" value={listing.view_count.toString()} />
        <StatCard label="Inquiries" value={listing.inquiry_count.toString()} />
        <StatCard
          label="Headline rent"
          value={formatCurrency(Number(listing.headline_rent))}
        />
      </div>

      <div className="mt-8">
        <ListingShare slug={listing.slug} appUrl={appUrl} />
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Title" value={listing.title} />
        <DetailRow label="Slug" value={listing.slug} />
        <DetailRow
          label="Available on"
          value={formatDate(listing.available_on)}
        />
        <DetailRow label="Contact email" value={listing.contact_email} />
        <DetailRow label="Contact phone" value={listing.contact_phone} />
        <DetailRow label="Created" value={formatDate(listing.created_at)} />
      </dl>

      {listing.description && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
            {listing.description}
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <DeleteListingButton listingId={listing.id} title={listing.title} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-3xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? '—'}</dd>
    </div>
  )
}
