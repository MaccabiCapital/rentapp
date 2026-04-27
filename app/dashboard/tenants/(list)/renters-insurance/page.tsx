// ============================================================
// Dashboard → Renters insurance → list page
// ============================================================
//
// Tracks whether each active tenant has a current renters-
// insurance policy on file. Expiring / expired policies surface
// at the top of the list.

import Link from 'next/link'
import { now } from '@/app/lib/now'
import {
  getRentersInsurancePolicies,
  getRentersInsuranceSummary,
} from '@/app/lib/queries/renters-insurance'
import {
  EXPIRY_BADGE,
  getRentersInsuranceExpiryStatus,
} from '@/app/lib/schemas/renters-insurance'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatUSD(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

export default async function RentersInsurancePage() {
  const [policies, summary] = await Promise.all([
    getRentersInsurancePolicies(),
    getRentersInsuranceSummary(),
  ])
  const nowMs = now()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Renters insurance
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track whether each tenant has a current renters-insurance policy
            on file. Upload their proof; get pinged before it lapses.
          </p>
        </div>
        <Link
          href="/dashboard/tenants/renters-insurance/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add a policy
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Policies on file" value={summary.total} />
        <SummaryCard
          label="Expiring within 30d"
          value={summary.expiringSoon}
          tone={summary.expiringSoon > 0 ? 'amber' : undefined}
        />
        <SummaryCard
          label="Expired"
          value={summary.expired}
          tone={summary.expired > 0 ? 'red' : undefined}
        />
        <SummaryCard
          label="Required but missing"
          value={summary.leasesRequiringWithoutPolicy}
          tone={
            summary.leasesRequiringWithoutPolicy > 0 ? 'red' : undefined
          }
        />
      </div>

      {policies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No renters policies yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Add each tenant&rsquo;s renters-insurance policy so you can prove
            lease compliance and catch lapses before they happen.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/tenants/renters-insurance/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add your first policy
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Tenant</Th>
                <Th>Property / unit</Th>
                <Th>Carrier / policy</Th>
                <Th>Liability</Th>
                <Th>Expiry</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {policies.map((p) => {
                const tenantName = p.tenant
                  ? `${p.tenant.first_name} ${p.tenant.last_name}`.trim()
                  : 'Unknown tenant'
                const unitLabel = p.lease?.unit?.unit_number ?? '—'
                const propertyName = p.lease?.unit?.property?.name ?? '—'
                const { status, days } = getRentersInsuranceExpiryStatus(
                  p.expiry_date,
                  nowMs,
                )
                const expiryLabel =
                  status === 'expired'
                    ? `Expired ${Math.abs(days)}d ago`
                    : `${days}d left`
                return (
                  <tr key={p.id} className="even:bg-zinc-50/40">
                    <Td>
                      <Link
                        href={`/dashboard/tenants/renters-insurance/${p.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {tenantName}
                      </Link>
                    </Td>
                    <Td>
                      <div className="text-sm">{propertyName}</div>
                      <div className="text-xs text-zinc-500">{unitLabel}</div>
                    </Td>
                    <Td>
                      <div className="text-sm">{p.carrier}</div>
                      {p.policy_number && (
                        <div className="text-xs text-zinc-500">
                          #{p.policy_number}
                        </div>
                      )}
                    </Td>
                    <Td>{formatUSD(p.liability_coverage)}</Td>
                    <Td>
                      <div className="text-sm">
                        {formatDate(p.expiry_date)}
                      </div>
                      <span
                        className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_BADGE[status]}`}
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
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'red' | 'amber'
}) {
  const color =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-zinc-200 bg-white text-zinc-900'
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${color}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
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
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}
