// ============================================================
// Dashboard → Insurance → [id] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { now } from '@/app/lib/now'
import { getInsurancePolicy } from '@/app/lib/queries/insurance'
import { getTeamMember } from '@/app/lib/queries/team'
import {
  POLICY_TYPE_LABELS,
  getExpirySeverity,
} from '@/app/lib/schemas/insurance'
import { displayTeamName } from '@/app/lib/schemas/team'
import { DeleteInsuranceButton } from '@/app/ui/delete-insurance-button'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const SEVERITY_BADGE = {
  expired: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-800',
} as const

export default async function InsuranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const policy = await getInsurancePolicy(id)
  if (!policy) notFound()

  const agent = policy.team_member_id
    ? await getTeamMember(policy.team_member_id)
    : null

  const { severity, days } = getExpirySeverity(policy.expiry_date, now())
  const expiryLabel =
    severity === 'expired'
      ? `Expired ${Math.abs(days)} days ago`
      : `${days} days left`

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/properties/insurance" className="hover:text-zinc-900">
          Insurance
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{policy.carrier}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {policy.carrier}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
              {POLICY_TYPE_LABELS[policy.policy_type]}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[severity]}`}
            >
              {expiryLabel}
            </span>
            {policy.auto_renewal && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Auto-renews
              </span>
            )}
          </div>
          {policy.policy_number && (
            <p className="mt-2 text-sm text-zinc-600">
              Policy #{policy.policy_number}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/dashboard/properties/insurance/${policy.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Link>
          <DeleteInsuranceButton
            policyId={policy.id}
            label={`${policy.carrier} (${POLICY_TYPE_LABELS[policy.policy_type]})`}
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Properties covered
        </h2>
        {policy.properties.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No properties linked yet.{' '}
            <Link
              href={`/dashboard/properties/insurance/${policy.id}/edit`}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Link properties
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {policy.properties.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/properties/${p.id}`}
                className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-900 hover:border-indigo-300 hover:text-indigo-700"
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow
          label="Coverage amount"
          value={formatCurrency(policy.coverage_amount)}
        />
        <DetailRow
          label="Liability limit"
          value={formatCurrency(policy.liability_limit)}
        />
        <DetailRow
          label="Annual premium"
          value={
            policy.annual_premium !== null
              ? `${formatCurrency(policy.annual_premium)}/yr`
              : '—'
          }
        />
        <DetailRow
          label="Deductible"
          value={formatCurrency(policy.deductible)}
        />
        <DetailRow
          label="Effective date"
          value={formatDate(policy.effective_date)}
        />
        <DetailRow label="Expiry date" value={formatDate(policy.expiry_date)} />
        <DetailRow
          label="Renewal date"
          value={formatDate(policy.renewal_date)}
        />
        <DetailRow
          label="Auto-renewal"
          value={policy.auto_renewal ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Insurance agent"
          value={
            agent ? (
              <Link
                href={`/dashboard/settings/team/${agent.id}`}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {displayTeamName(agent)}
              </Link>
            ) : null
          }
        />
        <DetailRow
          label="Document"
          value={
            policy.document_url ? (
              <a
                href={policy.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700"
              >
                Open declaration page
              </a>
            ) : null
          }
        />
        <DetailRow label="Notes" value={policy.notes} wide />
      </dl>
    </div>
  )
}

function DetailRow({
  label,
  value,
  wide,
}: {
  label: string
  value: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">
        {value == null || value === '' ? '—' : value}
      </dd>
    </div>
  )
}
