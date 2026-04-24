// ============================================================
// Workflow → Handle late rent
// ============================================================
//
// Anchor: lease_id. Late notice → wait grace period → pay-or-quit
// notice → consider eviction filing (outside the app).

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

export default async function LateRentWorkflow({
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
          title="Handle late rent"
          description="Pick the lease where rent is late. This walks through the escalation: reminder → grace period → formal pay-or-quit notice."
        />
        <WorkflowLeasePicker
          workflowSlug="late-rent"
          leases={leases}
          emptyMessage="No active leases."
        />
      </div>
    )
  }

  const lease = await loadWorkflowLease(leaseId)
  if (!lease) notFound()

  const [lateNotice, cureNotice] = await Promise.all([
    latestNoticeForLease(leaseId, 'late_rent'),
    latestNoticeForLease(leaseId, 'cure_or_quit'),
  ])

  const tenantName = lease.tenant
    ? `${lease.tenant.first_name} ${lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName = lease.unit?.property?.name ?? 'Unknown property'
  const unitLabel = lease.unit?.unit_number ?? 'Unit'

  // Whether the cure deadline has passed — we don't know the deadline
  // without loading the notice data, but if the notice is older than
  // 14 days, it's almost certainly passed for any state.
  let cureDeadlinePassed = false
  if (cureNotice) {
    const ageDays = Math.floor(
      (now() - new Date(cureNotice.generated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    if (ageDays > 14) cureDeadlinePassed = true
  }

  return (
    <div>
      <BackLink />
      <Header
        title="Handle late rent"
        description={`Escalation flow for ${tenantName} at ${propertyName} · ${unitLabel}.`}
      />

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">Do this in order</div>
        <p className="mt-1 text-amber-800">
          Escalation notices have to be issued in the right sequence to hold up
          in eviction court. Start with a late-rent reminder; only issue a
          pay-or-quit after the reminder + grace period, unless your state
          allows skipping the reminder (check Compliance).
        </p>
      </div>

      <div className="space-y-3">
        <WorkflowStepCard
          stepNumber={1}
          title="Send a late-rent reminder"
          description="Friendly first reminder — names the amount, late fee (if any), and total owed. Lower stakes than a pay-or-quit. Many states don't require this but it's the right move for a tenant who might just be forgetful."
          status={lateNotice ? 'done' : 'ready'}
          doneSummary={
            lateNotice
              ? `Generated ${formatDate(lateNotice.generated_at)}${lateNotice.served_at ? ` · served ${formatDate(lateNotice.served_at)}` : ' · not yet served'}`
              : undefined
          }
          actionHref={
            lateNotice
              ? `/dashboard/notices/${lateNotice.id}`
              : `/dashboard/notices/new?leaseId=${leaseId}&type=late_rent`
          }
          actionLabel={
            lateNotice ? 'View late-rent notice' : 'Generate late-rent notice'
          }
        />

        <WorkflowStepCard
          stepNumber={2}
          title="Wait the grace period"
          description={`Give the tenant the chance to pay. Your lease's grace period is typically 3–5 days after the due date. Escalate only after.${
            lease.unit?.property?.state
              ? ` Your state (${lease.unit.property.state}) has a statutory minimum grace period — see the Compliance page.`
              : ''
          }`}
          status={
            lateNotice && !cureNotice
              ? 'ready'
              : lateNotice || cureNotice
                ? 'done'
                : 'blocked'
          }
          actionHref="/dashboard/compliance"
          actionLabel="Check state grace period"
        />

        <WorkflowStepCard
          stepNumber={3}
          title="Issue a pay-or-quit notice"
          description="Formal demand: pay the full amount by a state-specific deadline, or vacate. Required before eviction proceedings in almost every state."
          status={cureNotice ? 'done' : 'ready'}
          doneSummary={
            cureNotice
              ? `Generated ${formatDate(cureNotice.generated_at)}${cureNotice.served_at ? ` · served ${formatDate(cureNotice.served_at)}` : ' · not yet served'}`
              : undefined
          }
          actionHref={
            cureNotice
              ? `/dashboard/notices/${cureNotice.id}`
              : `/dashboard/notices/new?leaseId=${leaseId}&type=cure_or_quit`
          }
          actionLabel={
            cureNotice
              ? 'View pay-or-quit notice'
              : 'Generate pay-or-quit notice'
          }
        />

        <WorkflowStepCard
          stepNumber={4}
          title="After the cure deadline"
          description={
            cureDeadlinePassed
              ? "The cure deadline on the pay-or-quit notice has almost certainly passed. If the tenant hasn't paid or moved out, the next step is filing for eviction — which happens in local court, not in this app. Talk to an attorney licensed in the property's state."
              : "Once the cure deadline passes unpaid: the tenant's in default. Document everything, mark the notice as served if you haven't yet, and if you're moving to eviction, talk to a local attorney. Eviction court filings are outside this app."
          }
          status={cureNotice ? (cureDeadlinePassed ? 'ready' : 'blocked') : 'blocked'}
          actionHref="/dashboard/leasing-assistant/audit"
          actionLabel="View audit log (for documentation)"
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
