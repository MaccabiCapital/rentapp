import Link from 'next/link'
import { createListing } from '@/app/actions/listings'
import { getPropertiesWithUnitsForListingForm } from '@/app/lib/queries/listings'
import { ListingForm } from '@/app/ui/listing-form'

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string
    unit?: string
    unitId?: string
    propertyId?: string
  }>
}) {
  const params = await searchParams
  const preselectedProperty = params.propertyId ?? params.property
  const preselectedUnit = params.unitId ?? params.unit
  const propertyOptions = await getPropertiesWithUnitsForListingForm()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/listings"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to listings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Create a listing
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Build a public landing page for a vacant unit. Share the URL on
          Zillow / Craigslist / yard sign, and inquiries flow directly into
          your prospects pipeline.
        </p>
      </div>
      <ListingForm
        action={createListing}
        propertyOptions={propertyOptions}
        defaultPropertyId={preselectedProperty ?? null}
        defaultUnitId={preselectedUnit ?? null}
        submitLabel="Create listing"
      />
    </div>
  )
}
