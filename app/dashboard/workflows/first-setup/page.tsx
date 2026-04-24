// ============================================================
// Workflow → First-time setup
// ============================================================
//
// Guided 4-step onboarding for brand-new landlords. Each step
// infers completion from the DB so returning to the wizard
// always shows accurate progress.

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { WorkflowStepCard } from '@/app/ui/workflow-step-card'

type SetupSummary = {
  propertyCount: number
  unitCount: number
  tenantCount: number
  leaseCount: number
}

async function getSetupSummary(): Promise<SetupSummary> {
  const supabase = await createServerClient()
  const [props, units, tenants, leases] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
  ])
  return {
    propertyCount: props.count ?? 0,
    unitCount: units.count ?? 0,
    tenantCount: tenants.count ?? 0,
    leaseCount: leases.count ?? 0,
  }
}

export default async function FirstSetupWorkflow() {
  const { propertyCount, unitCount, tenantCount, leaseCount } =
    await getSetupSummary()

  const allDone =
    propertyCount > 0 && unitCount > 0 && tenantCount > 0 && leaseCount > 0

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/workflows"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All workflows
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          First-time setup
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {allDone
            ? "You're all set. This wizard is here as a reference — you've got properties, units, tenants, and leases in the system."
            : "Welcome to Rentapp. These four steps get you to a working portfolio: a property, at least one unit, a tenant, and a lease. Once all four exist, the rest of the app lights up."}
        </p>
      </div>

      {allDone && (
        <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">
            ✓ Setup complete — everything below is done
          </div>
          <p className="mt-1 text-emerald-800">
            You have {propertyCount} propert
            {propertyCount === 1 ? 'y' : 'ies'}, {unitCount} unit
            {unitCount === 1 ? '' : 's'}, {tenantCount} tenant
            {tenantCount === 1 ? '' : 's'}, and {leaseCount} lease
            {leaseCount === 1 ? '' : 's'} in the system. Ready to use every
            workflow and module in the sidebar.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <WorkflowStepCard
          stepNumber={1}
          title="Add your first property"
          description="A property is the building itself — the address. A single-family house is one property with one unit. A duplex is one property with two units. Start here."
          status={propertyCount > 0 ? 'done' : 'ready'}
          doneSummary={
            propertyCount > 0
              ? `${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'} added`
              : undefined
          }
          actionHref={
            propertyCount > 0 ? '/dashboard/properties' : '/dashboard/properties/new'
          }
          actionLabel={
            propertyCount > 0 ? 'Manage properties' : 'Add a property'
          }
          secondaryHref={propertyCount > 0 ? undefined : '/dashboard/properties'}
          secondaryLabel={undefined}
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Add your first unit"
          description="Units are what you actually rent. Inside a single-family house, the house is the unit. Inside a duplex, each half is a separate unit with its own rent and lease. Adding a property usually gives you a form to add the first unit at the same time."
          status={
            unitCount > 0
              ? 'done'
              : propertyCount > 0
                ? 'ready'
                : 'blocked'
          }
          doneSummary={
            unitCount > 0
              ? `${unitCount} unit${unitCount === 1 ? '' : 's'} added`
              : undefined
          }
          actionHref={
            unitCount > 0
              ? '/dashboard/properties'
              : propertyCount > 0
                ? '/dashboard/properties'
                : undefined
          }
          actionLabel={
            unitCount > 0
              ? 'Manage units'
              : propertyCount > 0
                ? 'Add a unit to a property'
                : undefined
          }
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Add your first tenant"
          description="A tenant is the person renting. At minimum you need their name; email and phone come in handy later for notices and rent reminders. If you're migrating from a spreadsheet, bulk-import is faster."
          status={tenantCount > 0 ? 'done' : 'ready'}
          doneSummary={
            tenantCount > 0
              ? `${tenantCount} tenant${tenantCount === 1 ? '' : 's'} added`
              : undefined
          }
          actionHref={
            tenantCount > 0 ? '/dashboard/tenants' : '/dashboard/tenants/new'
          }
          actionLabel={tenantCount > 0 ? 'Manage tenants' : 'Add a tenant'}
          secondaryHref={
            tenantCount > 0 ? undefined : '/dashboard/tenants/import'
          }
          secondaryLabel={
            tenantCount > 0 ? undefined : 'Or bulk-import from CSV'
          }
        />

        <WorkflowStepCard
          stepNumber={4}
          title="Create your first lease"
          description="A lease links a tenant to a unit with terms: start date, end date, monthly rent, security deposit. Once a lease is active, the unit flips to occupied and rent tracking + everything else starts working."
          status={
            leaseCount > 0
              ? 'done'
              : tenantCount > 0 && unitCount > 0
                ? 'ready'
                : 'blocked'
          }
          doneSummary={
            leaseCount > 0
              ? `${leaseCount} lease${leaseCount === 1 ? '' : 's'} in the system`
              : undefined
          }
          actionHref={
            leaseCount > 0 || (tenantCount > 0 && unitCount > 0)
              ? '/dashboard/tenants'
              : undefined
          }
          actionLabel={
            leaseCount > 0
              ? 'Manage leases'
              : tenantCount > 0 && unitCount > 0
                ? 'Create a lease'
                : undefined
          }
        />

        <div className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          After setup
        </div>

        <WorkflowStepCard
          stepNumber={5}
          title="Onboard the tenant you just leased to"
          description="Once your first lease exists, run the Onboarding workflow: move-in inspection, renters insurance, welcome notice. It's the same workflow every future tenant will go through."
          status={leaseCount > 0 ? 'ready' : 'blocked'}
          actionHref={
            leaseCount > 0 ? '/dashboard/workflows/onboard-tenant' : undefined
          }
          actionLabel={leaseCount > 0 ? 'Go to onboarding' : undefined}
        />

        <WorkflowStepCard
          stepNumber={6}
          title="Bulk-import existing data (optional)"
          description="Got an existing spreadsheet of tenants, properties, or leases? Import instead of retyping."
          status="ready"
          actionHref="/dashboard/tenants/import"
          actionLabel="Import tenants"
          secondaryHref="/dashboard/properties/import"
          secondaryLabel="Import properties"
        />
      </div>
    </div>
  )
}
