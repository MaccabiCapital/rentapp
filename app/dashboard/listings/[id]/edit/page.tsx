import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getListing, getPropertiesWithUnitsForListingForm } from '@/app/lib/queries/listings'
import { updateListing } from '@/app/actions/listings'
import { ListingForm } from '@/app/ui/listing-form'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [listing, propertyOptions] = await Promise.all([
    getListing(id),
    getPropertiesWithUnitsForListingForm(),
  ])
  if (!listing) notFound()

  const updateWithId = updateListing.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/listings/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to listing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit listing
        </h1>
      </div>
      <ListingForm
        action={updateWithId}
        defaultValues={listing}
        propertyOptions={propertyOptions}
        submitLabel="Save changes"
      />
    </div>
  )
}
