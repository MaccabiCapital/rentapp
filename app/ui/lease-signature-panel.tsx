// ============================================================
// Lease detail → signature panel
// ============================================================
//
// Server component. Renders both parties' status side-by-side
// and exposes the request-tenant-link button + landlord-sign
// modal opener (LandlordSignButton is its own client island).

import {
  LEASE_SIGNATURE_STATUS_LABELS,
  LEASE_SIGNATURE_STATUS_BADGE,
  type LeaseSignature,
} from '@/app/lib/schemas/lease-signature'
import { RequestTenantSignatureButton } from './request-tenant-signature-button'
import { LandlordSignButton } from './landlord-sign-button'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LeaseSignaturePanel({
  leaseId,
  tenant,
  landlord,
  bothSigned,
  appUrl,
}: {
  leaseId: string
  tenant: LeaseSignature | null
  landlord: LeaseSignature | null
  bothSigned: boolean
  appUrl: string
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
          E-signatures
        </h2>
        {bothSigned && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Fully executed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tenant column */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Tenant</h3>
            {tenant && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEASE_SIGNATURE_STATUS_BADGE[tenant.status]}`}
              >
                {LEASE_SIGNATURE_STATUS_LABELS[tenant.status]}
              </span>
            )}
          </div>

          {!tenant && (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Generate a one-time link for the tenant to sign. The link
                expires in 14 days.
              </p>
              <div className="mt-4">
                <RequestTenantSignatureButton leaseId={leaseId} />
              </div>
            </>
          )}

          {tenant?.status === 'pending' && tenant.sign_token && (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Share this link with the tenant. Token expires{' '}
                {formatDateTime(tenant.token_expires_at)}.
              </p>
              <div className="mt-3 break-all rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs text-zinc-700">
                {appUrl}/lease-sign/{tenant.sign_token}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <RequestTenantSignatureButton
                  leaseId={leaseId}
                  label="Generate new link"
                />
              </div>
            </>
          )}

          {tenant?.status === 'signed' && (
            <div className="mt-3 space-y-1 text-xs text-zinc-700">
              <div>
                <span className="text-zinc-500">Name:</span>{' '}
                <span className="font-medium">{tenant.typed_name}</span>
              </div>
              <div>
                <span className="text-zinc-500">Signed:</span>{' '}
                {formatDateTime(tenant.signed_at)}
              </div>
              {tenant.signed_ip && (
                <div className="text-zinc-500">IP: {tenant.signed_ip}</div>
              )}
            </div>
          )}
        </div>

        {/* Landlord column */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Landlord</h3>
            {landlord && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEASE_SIGNATURE_STATUS_BADGE[landlord.status]}`}
              >
                {LEASE_SIGNATURE_STATUS_LABELS[landlord.status]}
              </span>
            )}
          </div>

          {(!landlord || landlord.status !== 'signed') && (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Counter-sign as landlord. Most landlords sign after the
                tenant, but you can sign first.
              </p>
              <div className="mt-4">
                <LandlordSignButton leaseId={leaseId} />
              </div>
            </>
          )}

          {landlord?.status === 'signed' && (
            <div className="mt-3 space-y-1 text-xs text-zinc-700">
              <div>
                <span className="text-zinc-500">Name:</span>{' '}
                <span className="font-medium">{landlord.typed_name}</span>
              </div>
              <div>
                <span className="text-zinc-500">Signed:</span>{' '}
                {formatDateTime(landlord.signed_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
