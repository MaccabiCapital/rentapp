import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeaseWithRelations } from '@/app/lib/queries/leases'
import { updateLease } from '@/app/actions/leases'
import { LeaseForm } from '@/app/ui/lease-form'

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string; leaseId: string }>
}) {
  const { id, leaseId } = await params
  const lease = await getLeaseWithRelations(leaseId)
  if (!lease || lease.tenant.id !== id) notFound()

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
      <LeaseForm
        action={updateWithId}
        defaultValues={lease}
        mode="edit"
      />
    </div>
  )
}
