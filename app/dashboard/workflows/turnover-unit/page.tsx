// ============================================================
// Workflow → Turnover a vacant unit
// ============================================================
//
// Anchor: unit_id. For when a tenant's gone and you're prepping
// the unit to re-rent. Maintenance checklist → create listing
// → take prospects.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  loadWorkflowUnit,
  activeListingForUnit,
  getUnitsForWorkflowPicker,
} from '@/app/lib/queries/workflow-context'
import { WorkflowStepCard } from '@/app/ui/workflow-step-card'
import { WorkflowUnitPicker } from '@/app/ui/workflow-lease-picker'

async function openMaintenanceForUnit(
  unitId: string,
): Promise<{ count: number; firstId: string | null }> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('maintenance_requests')
    .select('id, status')
    .eq('unit_id', unitId)
    .in('status', ['open', 'assigned', 'in_progress', 'awaiting_parts'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Array<{ id: string; status: string }>
  return {
    count: rows.length,
    firstId: rows.length > 0 ? rows[0].id : null,
  }
}

async function prospectsForUnit(unitId: string): Promise<number> {
  const supabase = await createServerClient()
  const { count } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', unitId)
    .is('deleted_at', null)
  return count ?? 0
}

export default async function TurnoverUnitWorkflow({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>
}) {
  const { unitId } = await searchParams

  if (!unitId) {
    const units = await getUnitsForWorkflowPicker('vacant')
    return (
      <div>
        <BackLink />
        <Header
          title="Turnover a vacant unit"
          description="Pick the unit to turn over. Walks through maintenance, listing creation, and prospect pipeline."
        />
        <WorkflowUnitPicker
          workflowSlug="turnover-unit"
          units={units}
          emptyMessage="No vacant units. Every unit is currently occupied, pending, or has notice given."
        />
      </div>
    )
  }

  const unit = await loadWorkflowUnit(unitId)
  if (!unit) notFound()

  const [maintenance, listing, prospectCount] = await Promise.all([
    openMaintenanceForUnit(unitId),
    activeListingForUnit(unitId),
    prospectsForUnit(unitId),
  ])

  const propertyName = unit.property?.name ?? 'Unknown property'
  const unitLabel = unit.unit_number ?? 'Unit'
  const isVacant = unit.status === 'vacant'

  return (
    <div>
      <BackLink />
      <Header
        title="Turnover a vacant unit"
        description={`Re-rent flow for ${propertyName} · ${unitLabel}.`}
      />

      <div className="mb-6 rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Unit
        </div>
        <div className="mt-1 text-zinc-900">
          {propertyName} · {unitLabel}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          Status: {unit.status}
          {unit.bedrooms !== null && <> · {unit.bedrooms}bd</>}
          {unit.bathrooms !== null && <> · {unit.bathrooms}ba</>}
          {unit.monthly_rent !== null && (
            <> · ${Number(unit.monthly_rent).toLocaleString()}/mo</>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <WorkflowStepCard
          stepNumber={1}
          title="Unit is vacant"
          description={
            isVacant
              ? 'Status confirmed — unit is vacant and ready for turnover work.'
              : 'Flip the unit status to vacant first. Usually this is done automatically once the lease ends or is terminated, but you can set it manually.'
          }
          status={isVacant ? 'done' : 'ready'}
          doneSummary={isVacant ? 'Vacant and available' : undefined}
          actionHref={`/dashboard/properties/${unit.property?.id ?? ''}/units/${unit.id}`}
          actionLabel="Update unit status"
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Handle turnover maintenance"
          description="Standard turnover checklist: paint touch-ups, deep clean, re-key locks, replace filters, test smoke + CO detectors, inspect appliances. Log each as a maintenance request so it's tracked and vendor-assignable."
          status={maintenance.count > 0 ? 'ready' : 'ready'}
          doneSummary={
            maintenance.count > 0
              ? `${maintenance.count} open maintenance item${maintenance.count === 1 ? '' : 's'} on this unit`
              : undefined
          }
          actionHref={
            maintenance.firstId
              ? `/dashboard/maintenance/${maintenance.firstId}`
              : '/dashboard/maintenance'
          }
          actionLabel={
            maintenance.firstId ? 'View open items' : 'Open Maintenance'
          }
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Create a listing"
          description="Put the unit on the market. Pre-filled from the unit's bedrooms/bathrooms/square feet, plus photos. You get a public-facing listing page to share on Zillow, Craigslist, Facebook Marketplace, etc."
          status={listing ? 'done' : 'ready'}
          doneSummary={
            listing
              ? `Listing "${listing.title}" is active`
              : undefined
          }
          actionHref={
            listing
              ? `/dashboard/listings/${listing.id}`
              : `/dashboard/listings/new?unitId=${unit.id}`
          }
          actionLabel={listing ? 'View listing' : 'Create listing'}
        />

        <WorkflowStepCard
          stepNumber={4}
          title="Take prospect inquiries"
          description="As people inquire, log them as prospects and (optionally) start a leasing-assistant conversation to draft replies."
          status={prospectCount > 0 ? 'done' : 'ready'}
          doneSummary={
            prospectCount > 0
              ? `${prospectCount} prospect${prospectCount === 1 ? '' : 's'} for this unit`
              : undefined
          }
          actionHref={`/dashboard/prospects/new?unitId=${unit.id}`}
          actionLabel="Log a prospect"
          secondaryHref="/dashboard/leasing-assistant/new"
          secondaryLabel="Start a leasing conversation"
        />

        <WorkflowStepCard
          stepNumber={5}
          title="Once someone signs: onboard them"
          description="When you land a tenant, their new lease kicks off the onboarding flow: move-in inspection, renters insurance, welcome notice."
          status="ready"
          actionHref="/dashboard/workflows/onboard-tenant"
          actionLabel="Go to onboarding"
        />
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <div className="mb-4">
      <Link
        href="/dashboard/workflows"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← All workflows
      </Link>
    </div>
  )
}

function Header({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
    </div>
  )
}
