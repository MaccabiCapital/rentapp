import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnit } from '@/app/lib/queries/units'
import { getTenantsForPicker } from '@/app/lib/queries/tenants'
import { getMyCompanyProfile } from '@/app/lib/queries/company-profile'
import { createLease } from '@/app/actions/leases'
import { LeaseForm } from '@/app/ui/lease-form'

export default async function NewLeasePage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id, unitId } = await params
  const [property, unit, tenantOptions, profile] = await Promise.all([
    getProperty(id),
    getUnit(unitId, id),
    getTenantsForPicker(),
    getMyCompanyProfile(),
  ])
  if (!property || !unit) notFound()

  const createForUnit = createLease.bind(null, unitId)
  const unitLabel = unit.unit_number ?? `Unit ${unitId.slice(0, 8)}`

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm text-zinc-600">
          <Link href="/dashboard/properties" className="hover:text-zinc-900">
            Properties
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/properties/${id}`}
            className="hover:text-zinc-900"
          >
            {property.name}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/dashboard/properties/${id}/units/${unitId}`}
            className="hover:text-zinc-900"
          >
            {unitLabel}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">New lease</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Start a lease
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          For {property.name} · {unitLabel}
        </p>
      </div>
      <LeaseForm
        action={createForUnit}
        tenantOptions={tenantOptions}
        companyDefaults={
          profile
            ? {
                late_fee_amount: profile.default_late_fee_amount,
                late_fee_grace_days: profile.default_grace_period_days,
              }
            : undefined
        }
        mode="create"
        submitLabel="Create lease"
      />
    </div>
  )
}
