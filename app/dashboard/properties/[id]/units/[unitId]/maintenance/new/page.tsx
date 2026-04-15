import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProperty } from '@/app/lib/queries/properties'
import { getUnit } from '@/app/lib/queries/units'
import { getActiveLeaseForUnit } from '@/app/lib/queries/leases'
import { getTeamMembersForPicker } from '@/app/lib/queries/team'
import { createMaintenanceRequest } from '@/app/actions/maintenance'
import { MaintenanceForm } from '@/app/ui/maintenance-form'

export default async function NewMaintenancePage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id, unitId } = await params
  const [property, unit, activeLease, teamOptions] = await Promise.all([
    getProperty(id),
    getUnit(unitId, id),
    getActiveLeaseForUnit(unitId),
    getTeamMembersForPicker([
      'maintenance',
      'plumber',
      'electrician',
      'hvac',
      'locksmith',
      'landscaper',
      'cleaning',
      'contractor',
      'inspector',
      'other',
    ]),
  ])
  if (!property || !unit) notFound()

  const createForUnit = createMaintenanceRequest.bind(null, unitId)
  const unitLabel = unit.unit_number ?? `Unit ${unitId.slice(0, 8)}`

  // Pre-fill the tenant picker with the active lease tenant.
  const tenantOptions = activeLease
    ? [
        {
          id: activeLease.tenant.id,
          first_name: activeLease.tenant.first_name,
          last_name: activeLease.tenant.last_name,
        },
      ]
    : []

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
          <span className="text-zinc-900">Report issue</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Report a maintenance issue
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          For {property.name} · {unitLabel}
        </p>
      </div>
      <MaintenanceForm
        action={createForUnit}
        mode="create"
        tenantOptions={tenantOptions}
        defaultTenantId={activeLease?.tenant.id ?? null}
        teamOptions={teamOptions}
        submitLabel="Create request"
      />
    </div>
  )
}
