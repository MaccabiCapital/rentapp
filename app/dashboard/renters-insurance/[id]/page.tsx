// ============================================================
// Dashboard → Renters insurance → [id] detail (view + edit)
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRentersInsurancePolicy } from '@/app/lib/queries/renters-insurance'
import { getTenantsForInsurancePicker } from '@/app/lib/queries/renters-insurance'
import { updateRentersInsurancePolicy } from '@/app/actions/renters-insurance'
import {
  getRentersInsuranceExpiryStatus,
  EXPIRY_BADGE,
} from '@/app/lib/schemas/renters-insurance'
import { RentersInsuranceForm } from '@/app/ui/renters-insurance-form'
import { RentersInsuranceDeleteButton } from '@/app/ui/renters-insurance-delete-button'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function RentersInsuranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [policy, tenants] = await Promise.all([
    getRentersInsurancePolicy(id),
    getTenantsForInsurancePicker(),
  ])
  if (!policy) notFound()

  const tenantName = policy.tenant
    ? `${policy.tenant.first_name} ${policy.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const propertyName = policy.lease?.unit?.property?.name ?? '—'
  const unitLabel = policy.lease?.unit?.unit_number ?? '—'

  const { status, days } = getRentersInsuranceExpiryStatus(policy.expiry_date)
  const expiryLabel =
    status === 'expired' ? `Expired ${Math.abs(days)}d ago` : `${days}d left`

  const boundUpdate = updateRentersInsurancePolicy.bind(null, policy.id)

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/renters-insurance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Renters insurance
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {tenantName} — {policy.carrier}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {propertyName} · {unitLabel}
            </p>
            {policy.policy_number && (
              <p className="mt-1 text-xs text-zinc-500">
                Policy #{policy.policy_number}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_BADGE[status]}`}
              >
                Expires {formatDate(policy.expiry_date)} · {expiryLabel}
              </span>
            </div>
            {policy.document_url && (
              <a
                href={policy.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View proof of insurance →
              </a>
            )}
            <RentersInsuranceDeleteButton id={policy.id} />
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
        Edit policy
      </h2>
      <RentersInsuranceForm
        action={boundUpdate}
        tenantOptions={tenants}
        existing={policy}
      />
    </div>
  )
}
