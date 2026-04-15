// ============================================================
// Dashboard → Listings → list page
// ============================================================

import Link from 'next/link'
import { getListingsByOwner } from '@/app/lib/queries/listings'

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

export default async function ListingsPage() {
  const listings = await getListingsByOwner()

  const active = listings.filter((l) => l.is_active)
  const inactive = listings.filter((l) => !l.is_active)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Listings</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Public landing pages for vacant units. Share the URL on Zillow,
            Craigslist, or print the QR code for a yard sign.
          </p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Create listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No listings yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Create a listing from any vacant unit to get a shareable URL and
            a QR code for yard signs. When someone fills out the inquiry
            form, they land in your prospects pipeline automatically.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/listings/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Create your first listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Active ({active.length})
              </h2>
              <ListingTable listings={active} />
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Inactive ({inactive.length})
              </h2>
              <ListingTable listings={inactive} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ListingTable({
  listings,
}: {
  listings: Awaited<ReturnType<typeof getListingsByOwner>>
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-zinc-200">
        <thead className="bg-zinc-50">
          <tr>
            <Th>Title</Th>
            <Th>Property</Th>
            <Th>Rent</Th>
            <Th>Available</Th>
            <Th>Views</Th>
            <Th>Inquiries</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {listings.map((l) => (
            <tr key={l.id} className="even:bg-zinc-50/40">
              <Td>
                <Link
                  href={`/dashboard/listings/${l.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {l.title}
                </Link>
              </Td>
              <Td className="text-zinc-700">
                {l.property.name}
                {l.unit?.unit_number ? ` · ${l.unit.unit_number}` : ''}
              </Td>
              <Td>{formatCurrency(Number(l.headline_rent))}</Td>
              <Td>{formatDate(l.available_on)}</Td>
              <Td>{l.view_count}</Td>
              <Td>{l.inquiry_count}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-sm text-zinc-900 ${className ?? ''}`}>
      {children}
    </td>
  )
}
