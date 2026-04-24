// ============================================================
// Tenant portal — token-authenticated read-only view
// ============================================================
//
// The token in the URL IS the credential. Treat as sensitive —
// this page must never accept user input, must never log the
// token, and should always serve over HTTPS.
//
// Surfaces: lease summary, property address, active notices,
// renters-insurance status.

import { notFound } from 'next/navigation'
import { getPortalTenantByToken } from '@/app/lib/queries/tenant-portal'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US')
}

function formatCurrency(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

const NOTICE_TYPE_LABEL: Record<string, string> = {
  rent_increase: 'Rent increase',
  entry: 'Entry notice',
  late_rent: 'Late rent notice',
  cure_or_quit: 'Pay or quit',
  terminate_tenancy: 'Termination',
  move_out_info: 'Move-out information',
}

export default async function TenantPortal({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getPortalTenantByToken(token)
  if (!data) notFound()

  const { tenant, lease, notices, rentersInsurance } = data

  const fullName = `${tenant.first_name} ${tenant.last_name}`.trim()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Hi {tenant.first_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Your lease summary, any notices from your landlord, and insurance
          status — all in one place. This page is read-only; reach out to
          your landlord directly to make changes.
        </p>
      </div>

      {/* Lease summary */}
      {lease ? (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Your lease
          </h2>
          <div className="space-y-2">
            {lease.unit?.property && (
              <>
                <div className="text-sm">
                  <span className="text-zinc-500">Property: </span>
                  <span className="font-medium text-zinc-900">
                    {lease.unit.property.name}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-zinc-500">Address: </span>
                  <span className="text-zinc-900">
                    {lease.unit.property.street_address}
                    {lease.unit?.unit_number
                      ? `, ${lease.unit.unit_number}`
                      : ''}
                    , {lease.unit.property.city}, {lease.unit.property.state}{' '}
                    {lease.unit.property.postal_code}
                  </span>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-4">
              <DetailCell
                label="Lease term"
                value={`${formatDate(lease.start_date)} → ${formatDate(lease.end_date)}`}
              />
              <DetailCell
                label="Monthly rent"
                value={formatCurrency(lease.monthly_rent)}
              />
              <DetailCell
                label="Rent due"
                value={`Day ${lease.rent_due_day} of each month`}
              />
              <DetailCell
                label="Security deposit"
                value={formatCurrency(lease.security_deposit)}
              />
            </div>
            <div className="pt-2 text-xs text-zinc-500">
              Lease status:{' '}
              <span className="font-medium capitalize">{lease.status}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-600">
          No active lease on file for {fullName}. Contact your landlord if
          this looks wrong.
        </div>
      )}

      {/* Renters insurance */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">
          Renters insurance
        </h2>
        {rentersInsurance ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-900">
                {rentersInsurance.carrier}
              </div>
              <div className="text-xs text-zinc-500">
                Expires {formatDate(rentersInsurance.expiry_date)}
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              On file
            </span>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            No current renters-insurance policy on file. If your lease
            requires renters insurance, send your landlord proof of your
            policy.
          </p>
        )}
      </div>

      {/* Notices */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">
          Notices from your landlord
        </h2>
        {notices.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No notices on file.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {notices.map((n) => (
              <li key={n.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-900">
                    {NOTICE_TYPE_LABEL[n.type] ?? n.type}
                  </div>
                  {n.served_at ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Served {formatDate(n.served_at)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      Draft
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Generated {formatDateTime(n.generated_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-500">
        Questions? Contact your landlord directly. This page is a read-only
        summary and doesn&rsquo;t accept messages.
      </div>
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  )
}
