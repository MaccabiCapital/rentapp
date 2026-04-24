// ============================================================
// Workflow → Onboard a tenant
// ============================================================
//
// Anchor: lease_id. If absent, show a picker of recent leases.
// Steps inferred from DB state so the landlord can do any step
// in any order and the UI tracks progress automatically.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  loadWorkflowLease,
  latestInspectionForLease,
  currentRentersInsuranceForTenant,
  latestNoticeForLease,
  getLeasesForWorkflowPicker,
} from '@/app/lib/queries/workflow-context'
import { WorkflowStepCard } from '@/app/ui/workflow-step-card'
import { WorkflowLeasePicker } from '@/app/ui/workflow-lease-picker'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function OnboardTenantWorkflow({
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
          title="Onboard a tenant"
          description="Pick the lease for the tenant you just signed. We'll walk through post-lease setup: move-in inspection, renters insurance, welcome notice."
        />
        <WorkflowLeasePicker
          workflowSlug="onboard-tenant"
          leases={leases}
          emptyMessage="No active leases yet. Create a lease first, then come back here to onboard the tenant."
        />
      </div>
    )
  }

  const lease = await loadWorkflowLease(leaseId)
  if (!lease) notFound()

  const [moveIn, insurance, welcomeNotice] = await Promise.all([
    latestInspectionForLease(leaseId, 'move_in'),
    lease.tenant ? currentRentersInsuranceForTenant(lease.tenant.id) : null,
    latestNoticeForLease(leaseId, 'entry'),
  ])

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName = lease.unit?.property?.name ?? 'Unknown property'
  const unitLabel = lease.unit?.unit_number ?? 'Unit'

  return (
    <div>
      <BackLink />
      <Header
        title="Onboard a tenant"
        description={`Post-lease setup for ${tenantName} at ${propertyName} · ${unitLabel}.`}
      />

      {/* Lease context card */}
      <div className="mb-6 rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Lease
        </div>
        <div className="mt-1 text-zinc-900">
          {tenantName} · {propertyName} · {unitLabel}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {formatDate(lease.start_date)} → {formatDate(lease.end_date)} ·{' '}
          ${Number(lease.monthly_rent).toLocaleString()}/mo
        </div>
      </div>

      <div className="space-y-3">
        <WorkflowStepCard
          stepNumber={1}
          title="Lease is in the system"
          description="The lease record exists. Move-in and onboarding steps can proceed."
          status="done"
          doneSummary={
            lease.signed_at
              ? `Signed ${formatDate(lease.signed_at)}`
              : 'Created (not yet signed)'
          }
          actionHref={`/dashboard/tenants/${lease.tenant?.id ?? ''}/leases/${lease.id}`}
          actionLabel="View lease"
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Move-in inspection"
          description="Document the condition of every room with photos and the tenant's signature. This is your #1 defense against security-deposit disputes later."
          status={
            moveIn
              ? moveIn.status === 'signed' || moveIn.status === 'completed'
                ? 'done'
                : 'ready'
              : 'ready'
          }
          doneSummary={
            moveIn
              ? `${moveIn.status === 'signed' ? 'Signed' : 'Completed'} on ${formatDate(moveIn.completed_at ?? moveIn.created_at)}`
              : undefined
          }
          actionHref={
            moveIn
              ? `/dashboard/inspections/${moveIn.id}`
              : `/dashboard/inspections/new?leaseId=${leaseId}&type=move_in`
          }
          actionLabel={moveIn ? 'Open inspection' : 'Start move-in inspection'}
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Log renters insurance"
          description="Most leases require tenants to carry renters insurance. Log the carrier, policy number, and expiry so you can prove compliance and get reminded before it lapses."
          status={insurance ? 'done' : 'ready'}
          doneSummary={
            insurance
              ? `${insurance.carrier} · expires ${formatDate(insurance.expiry_date)}`
              : undefined
          }
          actionHref={
            insurance
              ? `/dashboard/renters-insurance/${insurance.id}`
              : `/dashboard/renters-insurance/new?tenantId=${lease.tenant?.id ?? ''}&leaseId=${leaseId}`
          }
          actionLabel={insurance ? 'View policy' : 'Log policy'}
        />

        <WorkflowStepCard
          stepNumber={4}
          title="Send a welcome / information notice"
          description="Give the tenant the important contacts, rent payment instructions, maintenance request details, emergency contacts, and any house rules. An entry notice is a convenient template to adapt."
          status={welcomeNotice ? 'done' : 'ready'}
          doneSummary={
            welcomeNotice
              ? `Generated ${formatDate(welcomeNotice.generated_at)}${welcomeNotice.served_at ? ` · served ${formatDate(welcomeNotice.served_at)}` : ''}`
              : undefined
          }
          actionHref={
            welcomeNotice
              ? `/dashboard/notices/${welcomeNotice.id}`
              : `/dashboard/notices/new?leaseId=${leaseId}&type=entry`
          }
          actionLabel={welcomeNotice ? 'View notice' : 'Draft welcome notice'}
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
