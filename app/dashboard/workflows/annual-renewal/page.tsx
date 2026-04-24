// ============================================================
// Workflow → Annual renewal decision
// ============================================================
//
// Anchor: lease_id (expiring within 90 days). Decide:
//   a) renew at same terms → prompt to create a new lease
//   b) renew with rent change → generate rent_increase notice
//   c) non-renew → generate terminate_tenancy notice

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { now } from '@/app/lib/now'
import {
  loadWorkflowLease,
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

export default async function AnnualRenewalWorkflow({
  searchParams,
}: {
  searchParams: Promise<{ leaseId?: string }>
}) {
  const { leaseId } = await searchParams

  if (!leaseId) {
    const leases = await getLeasesForWorkflowPicker('expiring')
    return (
      <div>
        <BackLink />
        <Header
          title="Annual renewal decision"
          description="Pick the lease you need to make a decision on. Leases expiring within 90 days are listed, soonest first."
        />
        <WorkflowLeasePicker
          workflowSlug="annual-renewal"
          leases={leases}
          emptyMessage="No leases expiring in the next 90 days — you're ahead of the curve."
        />
      </div>
    )
  }

  const lease = await loadWorkflowLease(leaseId)
  if (!lease) notFound()

  const [rentIncreaseNotice, terminateNotice] = await Promise.all([
    latestNoticeForLease(leaseId, 'rent_increase'),
    latestNoticeForLease(leaseId, 'terminate_tenancy'),
  ])

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName = lease.unit?.property?.name ?? 'Unknown property'
  const unitLabel = lease.unit?.unit_number ?? 'Unit'

  const endMs = new Date(lease.end_date).getTime()
  const daysToEnd = Math.max(
    0,
    Math.floor((endMs - now()) / (1000 * 60 * 60 * 24)),
  )

  const decisionMade =
    !!rentIncreaseNotice || !!terminateNotice || !!lease.tenant_notice_given_on

  return (
    <div>
      <BackLink />
      <Header
        title="Annual renewal decision"
        description={`Lease with ${tenantName} at ${propertyName} · ${unitLabel} expires in ${daysToEnd} day${daysToEnd === 1 ? '' : 's'}.`}
      />

      <div className="mb-6 rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Current lease
        </div>
        <div className="mt-1 text-zinc-900">
          {formatDate(lease.start_date)} → {formatDate(lease.end_date)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          ${Number(lease.monthly_rent).toLocaleString()}/mo ·{' '}
          {lease.tenant_notice_given_on
            ? `Tenant gave notice ${formatDate(lease.tenant_notice_given_on)}`
            : 'No tenant notice logged'}
        </div>
      </div>

      <div className="space-y-3">
        <WorkflowStepCard
          stepNumber={1}
          title="Decide the path"
          description="Three options — pick the one that fits and follow the step below. Check your state's required notice window on the Compliance page first."
          status={decisionMade ? 'done' : 'ready'}
          doneSummary={
            lease.tenant_notice_given_on
              ? 'Tenant has given notice to leave'
              : terminateNotice
                ? 'You issued a termination notice'
                : rentIncreaseNotice
                  ? 'Rent increase notice issued'
                  : undefined
          }
          actionHref="/dashboard/compliance"
          actionLabel="Check state notice requirements"
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Renew at the same terms"
          description="Create a new lease with the same rent, pre-filled with the existing terms. The current lease status stays active until the new one supersedes it."
          status="ready"
          actionHref={`/dashboard/tenants/${lease.tenant?.id ?? ''}/leases/new?unitId=${lease.unit?.id ?? ''}&tenantId=${lease.tenant?.id ?? ''}`}
          actionLabel="Draft renewal lease"
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Renew with a rent change"
          description="Generate a formal rent-increase notice with the state-required notice window pre-filled, then draft the new lease at the new rate."
          status={rentIncreaseNotice ? 'done' : 'ready'}
          doneSummary={
            rentIncreaseNotice
              ? `Notice generated ${formatDate(rentIncreaseNotice.generated_at)}${rentIncreaseNotice.served_at ? ` · served ${formatDate(rentIncreaseNotice.served_at)}` : ''}`
              : undefined
          }
          actionHref={
            rentIncreaseNotice
              ? `/dashboard/notices/${rentIncreaseNotice.id}`
              : `/dashboard/notices/new?leaseId=${leaseId}&type=rent_increase`
          }
          actionLabel={
            rentIncreaseNotice
              ? 'View rent-increase notice'
              : 'Generate rent-increase notice'
          }
        />

        <WorkflowStepCard
          stepNumber={4}
          title="Non-renewal"
          description="Issue a termination notice telling the tenant the tenancy will not continue after the lease ends. State-specific language is baked into the PDF."
          status={terminateNotice ? 'done' : 'ready'}
          doneSummary={
            terminateNotice
              ? `Notice generated ${formatDate(terminateNotice.generated_at)}${terminateNotice.served_at ? ` · served ${formatDate(terminateNotice.served_at)}` : ''}`
              : undefined
          }
          actionHref={
            terminateNotice
              ? `/dashboard/notices/${terminateNotice.id}`
              : `/dashboard/notices/new?leaseId=${leaseId}&type=terminate_tenancy`
          }
          actionLabel={
            terminateNotice
              ? 'View termination notice'
              : 'Generate termination notice'
          }
        />

        <WorkflowStepCard
          stepNumber={5}
          title="If the tenant is leaving: run the offboard workflow"
          description="If the outcome is non-renewal (your choice or the tenant's), jump to the offboard flow to schedule the move-out inspection and security-deposit return."
          status="ready"
          actionHref={`/dashboard/workflows/offboard-tenant?leaseId=${leaseId}`}
          actionLabel="Start offboard workflow"
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
