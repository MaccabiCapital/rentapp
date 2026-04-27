// ============================================================
// Dashboard → Insurance → list page
// ============================================================
//
// Landlord view of every active policy covering any property,
// sorted by expiry. Expired and expiring-within-60d rows are
// pinned up top with a severity badge.

import Link from 'next/link'
import { now } from '@/app/lib/now'
import { getInsurancePolicies } from '@/app/lib/queries/insurance'
import {
  POLICY_TYPE_LABELS,
  getExpirySeverity,
} from '@/app/lib/schemas/insurance'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

const SEVERITY_BADGE = {
  expired: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-800',
} as const

export default async function InsurancePage() {
  const policies = await getInsurancePolicies()
  const nowMs = now()

  if (policies.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Insurance</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Landlord policies, umbrellas, flood, rent-loss — all tracked here.
              We&rsquo;ll remind you before anything expires.
            </p>
          </div>
          <Link
            href="/dashboard/properties/insurance/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add policy
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No insurance policies yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Log your landlord policy, umbrella, flood — whatever you have.
            We&rsquo;ll flag upcoming renewals on your dashboard so nothing
            lapses.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties/insurance/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add your first policy
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalAnnual = policies.reduce(
    (sum, p) => sum + (p.annual_premium ? Number(p.annual_premium) : 0),
    0,
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Insurance</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {policies.length} {policies.length === 1 ? 'policy' : 'policies'} ·
            {' '}
            {formatCurrency(totalAnnual)} annual premium
          </p>
        </div>
        <Link
          href="/dashboard/properties/insurance/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add policy
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Carrier / type</Th>
              <Th>Properties</Th>
              <Th>Coverage</Th>
              <Th>Premium</Th>
              <Th>Expiry</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {policies.map((p) => {
              const { severity, days } = getExpirySeverity(p.expiry_date, nowMs)
              const expiryLabel =
                severity === 'expired'
                  ? `Expired ${Math.abs(days)}d ago`
                  : `${days}d left`
              return (
                <tr key={p.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/properties/insurance/${p.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {p.carrier}
                    </Link>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {POLICY_TYPE_LABELS[p.policy_type]}
                    </div>
                  </Td>
                  <Td>
                    {p.properties.length === 0 ? (
                      <span className="text-xs text-zinc-500">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.properties.slice(0, 3).map((prop) => (
                          <span
                            key={prop.id}
                            className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                          >
                            {prop.name}
                          </span>
                        ))}
                        {p.properties.length > 3 && (
                          <span className="text-xs text-zinc-500">
                            +{p.properties.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="text-sm">
                      {formatCurrency(p.coverage_amount)}
                    </div>
                    {p.liability_limit !== null && (
                      <div className="text-xs text-zinc-500">
                        Liab: {formatCurrency(p.liability_limit)}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {p.annual_premium !== null
                      ? `${formatCurrency(p.annual_premium)}/yr`
                      : '—'}
                  </Td>
                  <Td>
                    <div className="text-sm text-zinc-900">
                      {formatDate(p.expiry_date)}
                    </div>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[severity]}`}
                    >
                      {expiryLabel}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
}
