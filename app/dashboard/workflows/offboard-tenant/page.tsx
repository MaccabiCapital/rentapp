// ============================================================
// Workflow → Offboard a tenant
// ============================================================
//
// Anchor: lease_id. Walks through move-out: capture notice,
// move-out inspection, comparison against move-in, security
// deposit return notice, then mark unit vacant.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  loadWorkflowLease,
  latestInspectionForLease,
  latestNoticeForLease,
  activeListingForUnit,
  nextLeaseForUnit,
  getLeasesForWorkflowPicker,
} from '@/app/lib/queries/workflow-context'
import { getSettlementForLease } from '@/app/lib/queries/security-deposits'
import { WorkflowStepCard } from '@/app/ui/workflow-step-card'
import { WorkflowLeasePicker } from '@/app/ui/workflow-lease-picker'
import { TurnoverDecisionPrompt } from '@/app/ui/turnover-decision-prompt'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function OffboardTenantWorkflow({
  searchParams,
}: {
  searchParams: Promise<{ leaseId?: string }>
}) {
  const { leaseId } = await searchParams

  if (!leaseId) {
    const leases = await getLeasesForWorkflowPicker('active')
    return (
      <div>
        <BackLink />
        <Header
          title="Offboard a tenant"
          description="Pick the lease for the tenant who's leaving. Handles move-out inspection, damage comparison, security deposit, and vacating the unit."
        />
        <WorkflowLeasePicker
          workflowSlug="offboard-tenant"
          leases={leases}
          emptyMessage="No active leases to offboard."
        />
      </div>
    )
  }

  const lease = await loadWorkflowLease(leaseId)
  if (!lease) notFound()

  const [
    moveIn,
    moveOut,
    visualInspection,
    terminateNotice,
    moveOutInfoNotice,
    activeListing,
    nextLease,
    depositSettlement,
  ] = await Promise.all([
    latestInspectionForLease(leaseId, 'move_in'),
    latestInspectionForLease(leaseId, 'move_out'),
    latestInspectionForLease(leaseId, 'periodic'),
    latestNoticeForLease(leaseId, 'terminate_tenancy'),
    latestNoticeForLease(leaseId, 'move_out_info'),
    lease.unit?.id ? activeListingForUnit(lease.unit.id) : null,
    lease.unit?.id ? nextLeaseForUnit(lease.unit.id, leaseId) : null,
    getSettlementForLease(leaseId),
  ])

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName = lease.unit?.property?.name ?? 'Unknown property'
  const unitLabel = lease.unit?.unit_number ?? 'Unit'

  const noticeLogged = !!lease.tenant_notice_given_on
  const moveOutDone =
    moveOut?.status === 'completed' || moveOut?.status === 'signed'
  const unitVacant = lease.unit?.status === 'vacant'

  return (
    <div>
      <BackLink />
      <Header
        title="Offboard a tenant"
        description={`Move-out for ${tenantName} at ${propertyName} · ${unitLabel} — then turnover → onboard the next tenant. The full cycle in one place.`}
      />

      {/* Lifecycle strip */}
      <LifecycleStrip
        current="offboard"
        noticeGiven={noticeLogged || !!terminateNotice}
        unitVacant={unitVacant}
        listingActive={!!activeListing}
        nextTenantSigned={!!nextLease}
      />

      <div className="mb-6 rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Lease
        </div>
        <div className="mt-1 text-zinc-900">
          {tenantName} · {propertyName} · {unitLabel}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          Ends {formatDate(lease.end_date)} ·{' '}
          {lease.tenant_notice_given_on
            ? `Notice given ${formatDate(lease.tenant_notice_given_on)}`
            : 'Notice not yet logged'}
        </div>
      </div>

      <div className="space-y-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Notice period · preparation
        </div>

        <WorkflowStepCard
          stepNumber={1}
          title="Log move-out notice"
          description={
            noticeLogged
              ? 'Tenant has given written notice (or you served a termination notice). This is the trigger for the rest of the flow.'
              : "Either the tenant gave notice or you're terminating the tenancy. Log the date on the lease record, or generate a formal termination notice if you're the one ending the tenancy."
          }
          status={noticeLogged || terminateNotice ? 'done' : 'ready'}
          doneSummary={
            noticeLogged
              ? `Tenant notice on ${formatDate(lease.tenant_notice_given_on)}`
              : terminateNotice
                ? `Termination notice generated ${formatDate(terminateNotice.generated_at)}${terminateNotice.served_at ? ` · served ${formatDate(terminateNotice.served_at)}` : ''}`
                : undefined
          }
          actionHref={`/dashboard/tenants/${lease.tenant?.id ?? ''}/leases/${lease.id}`}
          actionLabel="Update lease"
          secondaryHref={
            terminateNotice
              ? `/dashboard/tenants/notices/${terminateNotice.id}`
              : `/dashboard/tenants/notices/new?leaseId=${leaseId}&type=terminate_tenancy`
          }
          secondaryLabel={
            terminateNotice
              ? 'View termination notice'
              : 'Generate a formal termination notice'
          }
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Pre-turnover visual inspection"
          description="Quick walkthrough within a day or two of notice being given. Assess what the unit will need — paint touch-ups, carpet, full refresh, etc. This informs your list-now vs wait decision below. Uses a 'periodic' inspection so it's kept separate from the move-in / move-out records."
          status={
            visualInspection
              ? 'done'
              : noticeLogged || terminateNotice
                ? 'ready'
                : 'blocked'
          }
          doneSummary={
            visualInspection
              ? `${visualInspection.status === 'signed' ? 'Signed' : visualInspection.status === 'completed' ? 'Completed' : 'In progress'} ${formatDate(visualInspection.completed_at ?? visualInspection.created_at)}`
              : undefined
          }
          actionHref={
            visualInspection
              ? `/dashboard/properties/inspections/${visualInspection.id}`
              : `/dashboard/properties/inspections/new?leaseId=${leaseId}&type=periodic`
          }
          actionLabel={
            visualInspection
              ? 'Open visual inspection'
              : 'Start visual inspection'
          }
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Give the tenant the move-out info packet"
          description="Hand the tenant a written packet covering your right to show the unit, move-out day procedures (keys, cleaning, elevator/dock booking), security deposit return process, and utility transfer. Generates a formal PDF you can email, print, or mail."
          status={
            moveOutInfoNotice
              ? 'done'
              : noticeLogged || terminateNotice
                ? 'ready'
                : 'blocked'
          }
          doneSummary={
            moveOutInfoNotice
              ? `Generated ${formatDate(moveOutInfoNotice.generated_at)}${moveOutInfoNotice.served_at ? ` · given ${formatDate(moveOutInfoNotice.served_at)}` : ' · not yet given to tenant'}`
              : undefined
          }
          actionHref={
            moveOutInfoNotice
              ? `/dashboard/tenants/notices/${moveOutInfoNotice.id}`
              : `/dashboard/tenants/notices/new?leaseId=${leaseId}&type=move_out_info`
          }
          actionLabel={
            moveOutInfoNotice ? 'View info packet' : 'Generate info packet'
          }
        />

        {(noticeLogged || !!terminateNotice) && (
          <TurnoverDecisionPrompt
            leaseId={lease.id}
            currentStrategy={lease.turnover_strategy ?? null}
          />
        )}

        <div className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Move-out day
        </div>

        <WorkflowStepCard
          stepNumber={4}
          title="Move-out inspection"
          description="Walk through every room, rate the condition, take photos, get the tenant to sign off. This is your evidence for any deductions."
          status={
            moveOut
              ? moveOutDone
                ? 'done'
                : 'ready'
              : 'ready'
          }
          doneSummary={
            moveOut
              ? `${moveOut.status === 'signed' ? 'Signed' : moveOut.status === 'completed' ? 'Completed' : 'In progress'} ${formatDate(moveOut.completed_at ?? moveOut.created_at)}`
              : undefined
          }
          actionHref={
            moveOut
              ? `/dashboard/properties/inspections/${moveOut.id}`
              : `/dashboard/properties/inspections/new?leaseId=${leaseId}&type=move_out`
          }
          actionLabel={moveOut ? 'Open inspection' : 'Start move-out inspection'}
        />

        <WorkflowStepCard
          stepNumber={5}
          title="Compare to move-in"
          description={
            moveIn
              ? 'Side-by-side diff highlighting what got worse between move-in and move-out. Generates a damage summary you can attach to your deposit accounting.'
              : 'A move-in inspection is required to run the comparison. If no move-in exists, you can still do a move-out alone — but damage claims will be harder to defend.'
          }
          status={
            moveOut && moveIn && moveOutDone
              ? 'ready'
              : moveOut && moveIn
                ? 'blocked'
                : 'blocked'
          }
          actionHref={
            moveOut
              ? `/dashboard/properties/inspections/${moveOut.id}/compare`
              : undefined
          }
          actionLabel={moveOut ? 'Open comparison' : undefined}
        />

        <WorkflowStepCard
          stepNumber={6}
          title="Security deposit accounting"
          description={
            depositSettlement?.status === 'mailed'
              ? `Itemized deposit accounting was generated and mailed${depositSettlement.mailed_at ? ` on ${formatDate(depositSettlement.mailed_at.slice(0, 10))}` : ''}.`
              : depositSettlement?.status === 'finalized'
                ? `Letter is finalized — print it, mail it (certified is safest), then come back and mark it as mailed. Legal deadline: ${depositSettlement.legal_deadline_date ? formatDate(depositSettlement.legal_deadline_date) : 'not yet computed'}.`
                : depositSettlement?.status === 'draft'
                  ? `A draft is in progress. Pre-filled damage deductions from the move-out comparison; review amounts, add forwarding address, then finalize.`
                  : `Within your state's required window${lease.unit?.property?.state ? ` (${lease.unit.property.state})` : ''}, generate the itemized deposit accounting. Damage deductions are pre-filled from the move-in vs move-out inspection comparison.`
          }
          status={
            depositSettlement?.status === 'mailed'
              ? 'done'
              : depositSettlement
                ? 'ready'
                : moveOutDone
                  ? 'ready'
                  : 'blocked'
          }
          doneSummary={
            depositSettlement?.status === 'mailed' && depositSettlement.mailed_at
              ? `Mailed ${formatDate(depositSettlement.mailed_at.slice(0, 10))}`
              : undefined
          }
          actionHref={
            depositSettlement
              ? `/dashboard/tenants/security-deposits/${depositSettlement.id}`
              : `/dashboard/tenants/security-deposits/new?leaseId=${leaseId}`
          }
          actionLabel={
            depositSettlement
              ? depositSettlement.status === 'mailed'
                ? 'View letter'
                : depositSettlement.status === 'finalized'
                  ? 'Mark as mailed'
                  : 'Continue draft'
              : 'Generate deposit accounting'
          }
        />

        <WorkflowStepCard
          stepNumber={7}
          title="Mark unit vacant + update lease status"
          description="Once the tenant is out and the deposit is returned, flip the unit to vacant and close out the lease."
          status={unitVacant ? 'done' : 'ready'}
          doneSummary={unitVacant ? 'Unit is vacant' : undefined}
          actionHref={`/dashboard/properties/${lease.unit?.property?.id ?? ''}/units/${lease.unit?.id ?? ''}`}
          actionLabel="Update unit status"
        />

        {/* Turnover phase */}
        <div className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Turnover phase
        </div>

        <WorkflowStepCard
          stepNumber={8}
          title="Put the unit up for rent"
          description={
            lease.turnover_strategy === 'wait_until_vacant'
              ? 'Deferred — you chose to wait until the unit is vacant before listing (full refresh needed). This step unlocks the moment the unit is marked vacant in step 5.'
              : lease.turnover_strategy === 'list_during_notice'
                ? 'Start the turnover workflow now: maintenance prep, create a listing, take prospect inquiries. Showings during the notice period require proper entry notice to the outgoing tenant (24–48 hours depending on state).'
                : 'Decide your turnover strategy above, then list the unit. Most markets start listing the day notice is given to minimize vacant days.'
          }
          status={(() => {
            if (activeListing) return 'done'
            if (!noticeLogged && !terminateNotice) return 'blocked'
            if (lease.turnover_strategy === 'wait_until_vacant') {
              return unitVacant ? 'ready' : 'blocked'
            }
            if (lease.turnover_strategy === 'list_during_notice') return 'ready'
            // Undecided
            return 'ready'
          })()}
          doneSummary={
            activeListing
              ? `Listing "${activeListing.title}" is live`
              : lease.turnover_strategy === 'wait_until_vacant' && !unitVacant
                ? 'Deferred until move-out'
                : undefined
          }
          actionHref={
            lease.unit?.id &&
            !(
              lease.turnover_strategy === 'wait_until_vacant' && !unitVacant
            )
              ? `/dashboard/workflows/turnover-unit?unitId=${lease.unit.id}`
              : undefined
          }
          actionLabel={
            activeListing
              ? 'Open turnover workflow'
              : lease.turnover_strategy === 'wait_until_vacant' && !unitVacant
                ? undefined
                : 'Start turnover'
          }
          secondaryHref={
            activeListing
              ? `/dashboard/listings/${activeListing.id}`
              : lease.turnover_strategy === 'list_during_notice' &&
                  (noticeLogged || !!terminateNotice)
                ? `/dashboard/tenants/notices/new?leaseId=${leaseId}&type=entry`
                : undefined
          }
          secondaryLabel={
            activeListing
              ? 'View the listing'
              : lease.turnover_strategy === 'list_during_notice' &&
                  (noticeLogged || !!terminateNotice)
                ? 'Draft an entry notice for showings'
                : undefined
          }
        />

        {/* Onboard phase */}
        <div className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Onboard phase
        </div>

        <WorkflowStepCard
          stepNumber={9}
          title="Onboard the next tenant"
          description={
            nextLease
              ? `A new lease for ${nextLease.tenant_name} is on this unit. Jump to the onboarding workflow for move-in inspection, renters insurance, and welcome notice.`
              : 'Once a new lease is signed on this unit, this step unlocks. The onboarding workflow handles the move-in inspection, renters insurance, and welcome notice for the incoming tenant.'
          }
          status={nextLease ? 'ready' : 'blocked'}
          doneSummary={undefined}
          actionHref={
            nextLease
              ? `/dashboard/workflows/onboard-tenant?leaseId=${nextLease.id}`
              : undefined
          }
          actionLabel={nextLease ? 'Onboard the new tenant' : undefined}
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Lifecycle strip — visual overview of the three phases
// ------------------------------------------------------------

function LifecycleStrip({
  current,
  noticeGiven,
  unitVacant,
  listingActive,
  nextTenantSigned,
}: {
  current: 'offboard' | 'turnover' | 'onboard'
  noticeGiven: boolean
  unitVacant: boolean
  listingActive: boolean
  nextTenantSigned: boolean
}) {
  // Offboard + turnover phases overlap: the moment notice is given,
  // turnover work (listing, showings, prospect pipeline) begins even
  // though the outgoing tenant hasn't moved out yet. unitVacant just
  // means the offboarding is "done" at the handoff.
  const phases: Array<{
    key: 'offboard' | 'turnover' | 'onboard'
    label: string
    icon: string
    state: 'done' | 'current' | 'next' | 'blocked'
  }> = [
    {
      key: 'offboard',
      label: 'Offboard',
      icon: '📦',
      state: unitVacant ? 'done' : 'current',
    },
    {
      key: 'turnover',
      label: 'Turnover',
      icon: '🧹',
      state: nextTenantSigned
        ? 'done'
        : noticeGiven
          ? listingActive
            ? 'current'
            : 'next'
          : 'blocked',
    },
    {
      key: 'onboard',
      label: 'Onboard',
      icon: '👋',
      state: nextTenantSigned ? 'current' : 'blocked',
    },
  ]

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        {phases.map((p, i) => {
          const isActive = p.key === current
          const cls =
            p.state === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : p.state === 'current' || isActive
                ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                : p.state === 'next'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
          return (
            <div key={p.key} className="flex flex-1 items-center">
              <div
                className={`flex-1 rounded-md border px-3 py-2 text-xs ${cls}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{p.icon}</span>
                  <span className="font-semibold uppercase tracking-wider">
                    {p.label}
                  </span>
                  {p.state === 'done' && (
                    <span className="ml-auto text-emerald-700">✓</span>
                  )}
                  {isActive && (
                    <span className="ml-auto rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      YOU ARE HERE
                    </span>
                  )}
                </div>
              </div>
              {i < phases.length - 1 && (
                <span className="mx-1 text-zinc-400">→</span>
              )}
            </div>
          )
        })}
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
