import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaseWithRelations } from '@/app/lib/queries/leases'
import { getStateRule } from '@/app/lib/queries/state-rules'
import { updateLease } from '@/app/actions/leases'
import { LeaseForm } from '@/app/ui/lease-form'
import { RentCapWarning } from '@/app/ui/rent-cap-warning'

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string; leaseId: string }>
}) {
  const { id, leaseId } = await params
  const lease = await getLeaseWithRelations(leaseId)
  if (!lease || lease.tenant.id !== id) notFound()

  // Fetch state rule for the property's state so we can show
  // a rent cap warning above the form when applicable.
  const propertyState = lease.unit.property.state
  const stateRule = propertyState ? await getStateRule(propertyState) : null

  const updateWithId = updateLease.bind(null, leaseId)
  const tenantName = `${lease.tenant.first_name} ${lease.tenant.last_name}`

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm text-zinc-600">
          <Link href="/dashboard/tenants" className="hover:text-zinc-900">
            Tenants
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/tenants/${id}`}
            className="hover:text-zinc-900"
          >
            {tenantName}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/tenants/${id}/leases/${leaseId}`}
            className="hover:text-zinc-900"
          >
            Lease
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">Edit</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit lease
        </h1>
      </div>
      {stateRule && stateRule.has_statewide_cap && (
        <div className="mx-auto mb-4 max-w-2xl">
          <RentCapWarning
            rule={stateRule}
            currentRent={Number(lease.monthly_rent)}
            state={propertyState}
          />
        </div>
      )}
      <LeaseForm
        action={updateWithId}
        defaultValues={lease}
        mode="edit"
      />
    </div>
  )
}
