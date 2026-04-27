// ============================================================
// Dashboard → Security deposits → detail
// ============================================================
//
// Three states:
//   draft     — full edit (header, deductions, forwarding addr)
//   finalized — locked itemization, can mark mailed or unfinalize
//   mailed    — terminal; record-only

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSettlement } from '@/app/lib/queries/security-deposits'
import {
  SETTLEMENT_STATUS_LABELS,
  STATUS_BADGE,
  DEDUCTION_CATEGORY_LABELS,
  MAIL_METHOD_LABELS,
  formatMoney,
} from '@/app/lib/schemas/security-deposit'
import { SettlementHeaderForm } from '@/app/ui/settlement-header-form'
import { SettlementDeductionEditor } from '@/app/ui/settlement-deduction-editor'
import { SettlementFinalizeBar } from '@/app/ui/settlement-finalize-bar'
import { SettlementMarkMailedForm } from '@/app/ui/settlement-mark-mailed-form'
import { SettlementDeleteButton } from '@/app/ui/settlement-delete-button'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function daysFromToday(deadline: string | null): number | null {
  if (!deadline) return null
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const target = new Date(deadline + 'T00:00:00Z')
  const diff = Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  return diff
}

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const settlement = await getSettlement(id)
  if (!settlement) notFound()

  const tenantName = settlement.lease?.tenant
    ? `${settlement.lease.tenant.first_name} ${settlement.lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName =
    settlement.lease?.unit?.property?.name ?? 'Unknown property'
  const unitLabel = settlement.lease?.unit?.unit_number ?? 'Unit'
  const propertyState = settlement.lease?.unit?.property?.state ?? null

  const isDraft = settlement.status === 'draft'
  const isFinalized = settlement.status === 'finalized'
  const isMailed = settlement.status === 'mailed'

  const daysUntilDeadline = daysFromToday(settlement.legal_deadline_date)
  const overdue = daysUntilDeadline !== null && daysUntilDeadline < 0
  const urgentSoon =
    daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7

  return (
    <div>
      {/* Back link + header */}
      <div className="mb-4">
        <Link
          href="/dashboard/tenants/security-deposits"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All deposit settlements
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Deposit accounting · {tenantName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[settlement.status]}`}
            >
              {SETTLEMENT_STATUS_LABELS[settlement.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {propertyName} · {unitLabel}
            {propertyState ? ` · ${propertyState}` : ''}
            {settlement.lease
              ? ` · lease ended ${formatDate(settlement.lease.end_date)}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/tenants/security-deposits/${settlement.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Download PDF
          </a>
          {isDraft && <SettlementDeleteButton settlementId={settlement.id} />}
        </div>
      </div>

      {/* Deadline banner */}
      {settlement.legal_deadline_date && (
        <div
          className={`mb-6 rounded-md border p-4 text-sm ${
            isMailed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : overdue
                ? 'border-red-200 bg-red-50 text-red-900'
                : urgentSoon
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          <div className="font-semibold">
            {isMailed
              ? 'Mailed'
              : overdue
                ? 'Past legal deadline'
                : urgentSoon
                  ? 'Deadline approaching'
                  : 'Legal deadline'}
          </div>
          <p className="mt-1">
            {propertyState ?? 'This state'} requires the deposit accounting
            letter to be mailed to the tenant within{' '}
            <strong>{settlement.state_return_days} days</strong> of lease end.
            Deadline: <strong>{formatDate(settlement.legal_deadline_date)}</strong>
            {!isMailed && daysUntilDeadline !== null && (
              <>
                {' '}·{' '}
                {overdue
                  ? `${Math.abs(daysUntilDeadline)} days overdue`
                  : `${daysUntilDeadline} days remaining`}
              </>
            )}
            {isMailed && settlement.mailed_at && (
              <> · mailed {formatDate(settlement.mailed_at.slice(0, 10))}</>
            )}
            .
          </p>
        </div>
      )}

      {/* Net summary */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Original deposit
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatMoney(settlement.original_deposit)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Total deductions
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatMoney(settlement.totalDeductions)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {settlement.net >= 0 ? 'Refund to tenant' : 'Balance owed by tenant'}
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${settlement.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {formatMoney(Math.abs(settlement.net))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: forwarding address + deduction list */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SettlementHeaderForm
            settlementId={settlement.id}
            initial={{
              forwarding_street_address: settlement.forwarding_street_address,
              forwarding_unit: settlement.forwarding_unit,
              forwarding_city: settlement.forwarding_city,
              forwarding_state: settlement.forwarding_state,
              forwarding_postal_code: settlement.forwarding_postal_code,
              notes: settlement.notes,
            }}
            isDraft={isDraft}
          />
        </div>

        <div className="lg:col-span-2">
          <SettlementDeductionEditor
            settlementId={settlement.id}
            items={settlement.items}
            isDraft={isDraft}
          />
        </div>
      </div>

      {/* Status transitions */}
      <div className="mt-6">
        {isDraft && (
          <SettlementFinalizeBar
            settlementId={settlement.id}
            hasItems={settlement.items.length > 0}
            hasForwardingAddress={Boolean(
              settlement.forwarding_street_address &&
                settlement.forwarding_city &&
                settlement.forwarding_state,
            )}
          />
        )}
        {isFinalized && (
          <SettlementMarkMailedForm settlementId={settlement.id} />
        )}
        {isMailed && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-semibold">Mailed</div>
            <p className="mt-1">
              {settlement.mail_method
                ? MAIL_METHOD_LABELS[settlement.mail_method]
                : 'Method not recorded'}
              {settlement.mailed_at
                ? ` · sent on ${formatDate(settlement.mailed_at.slice(0, 10))}`
                : ''}
              {settlement.mail_tracking_number
                ? ` · tracking ${settlement.mail_tracking_number}`
                : ''}
            </p>
          </div>
        )}
      </div>

      {/* Inspection link */}
      {settlement.items.some((i) => i.inspection_item_id) && (
        <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <div className="font-semibold text-zinc-900">
            Source: move-out inspection
          </div>
          <p className="mt-1">
            Damage deductions were pre-filled from the move-in vs move-out
            inspection comparison. Edit any of the auto-suggested items above
            to set actual repair amounts based on quotes or receipts. Removing
            an item here doesn&rsquo;t affect the inspection record.
          </p>
        </div>
      )}

      {/* Category quick-reference */}
      <div className="mt-6">
        <details className="rounded-md border border-zinc-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700">
            Deduction categories quick reference
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs text-zinc-600">
            {Object.entries(DEDUCTION_CATEGORY_LABELS).map(([key, label]) => (
              <li key={key}>
                <strong>{label}</strong>
                {key === 'damage' &&
                  ' — physical damage beyond normal wear and tear (carpet stains, holes in walls).'}
                {key === 'cleaning' &&
                  ' — only excessive cleaning required to return unit to move-in condition.'}
                {key === 'unpaid_rent' &&
                  ' — balance owed under the lease at move-out.'}
                {key === 'unpaid_utilities' &&
                  ' — tenant-responsible utilities (water, electric, gas) left unpaid.'}
                {key === 'late_fees' &&
                  ' — fees due under the lease that went unpaid.'}
                {key === 'lockout_or_keys' &&
                  ' — lost keys, lockouts, or lock changes the tenant caused.'}
                {key === 'other' && ' — anything else; describe clearly.'}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}
