// ============================================================
// Public lease signing page (token-authenticated)
// ============================================================
//
// Tenants land here from a link the landlord generated. No login
// required — the token in the URL is the credential.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSigningContextByToken } from '@/app/lib/queries/lease-signatures'
import { LeaseSignForm } from '@/app/ui/lease-sign-form'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function LeaseSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const ctx = await getSigningContextByToken(token)
  if (!ctx) notFound()

  // Token expired (signature row exists but expiry passed)
  if (!ctx.lease) {
    return (
      <div className="min-h-full bg-zinc-50">
        <main className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
            <h1 className="text-xl font-semibold text-amber-900">
              This signing link has expired
            </h1>
            <p className="mt-2 text-sm text-amber-800">
              Ask your landlord to send you a new signing link. They can
              generate one from the lease detail page in their dashboard.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const lease = ctx.lease

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="text-sm font-semibold text-zinc-900">
            {lease.landlord_name}
          </span>
          <span className="text-xs text-zinc-500">Sign your lease</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Sign your lease
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Review the details below, type your full legal name, and draw
            your signature. By signing, you agree this is the legal
            equivalent of a handwritten signature.
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Detail label="Tenant" value={lease.tenant_name} />
            <Detail label="Landlord" value={lease.landlord_name} />
            <Detail
              label="Property"
              value={`${lease.property_name}${lease.unit_number ? ` · ${lease.unit_number}` : ''}`}
            />
            <Detail
              label="Monthly rent"
              value={formatMoney(lease.monthly_rent)}
            />
            <Detail label="Start date" value={formatDate(lease.start_date)} />
            <Detail label="End date" value={formatDate(lease.end_date)} />
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <LeaseSignForm token={token} suggestedName={lease.tenant_name} />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Powered by Rentbase. Your signature, name, IP address, and the
          time are recorded for the legal record.{' '}
          <Link href="/" className="underline hover:text-zinc-700">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  )
}
