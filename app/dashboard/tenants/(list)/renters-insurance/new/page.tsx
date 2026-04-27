import Link from 'next/link'
import { createRentersInsurancePolicy } from '@/app/actions/renters-insurance'
import { getTenantsForInsurancePicker } from '@/app/lib/queries/renters-insurance'
import { RentersInsuranceForm } from '@/app/ui/renters-insurance-form'

export default async function NewRentersInsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; leaseId?: string }>
}) {
  const [tenants, params] = await Promise.all([
    getTenantsForInsurancePicker(),
    searchParams,
  ])

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/tenants/renters-insurance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Renters insurance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add a renters-insurance policy
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Record the tenant&rsquo;s current renters policy so you can prove
          lease compliance and catch lapses before they happen.
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No tenants yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Add a tenant first, then you can log their renters insurance.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/tenants"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Go to Tenants
            </Link>
          </div>
        </div>
      ) : (
        <RentersInsuranceForm
          action={createRentersInsurancePolicy}
          tenantOptions={tenants}
          initialTenantId={params.tenantId}
          initialLeaseId={params.leaseId}
        />
      )}
    </div>
  )
}
