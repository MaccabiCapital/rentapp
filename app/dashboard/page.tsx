import Link from 'next/link'
import { getUser } from '@/lib/supabase/get-user'

export default async function DashboardHome() {
  const user = await getUser()
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'there'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome, {displayName}
        </h1>
        <p className="mt-2 text-slate-600">
          This is where your rent roll, vacancies, and tenants will live.
          We&apos;ll get you set up in a minute — first, add your first
          property.
        </p>
      </div>

      {/* Empty-state call-to-action stack — sprint 1 will replace these
          with the real rent roll, vacancy list, and upcoming renewals. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <EmptyCard
          title="Add your first property"
          body="Start by creating a property record — an address, a unit, and a monthly rent. Everything else builds from there."
          href="/dashboard/properties"
          cta="Add property"
          primary
        />
        <EmptyCard
          title="Invite a tenant"
          body="Create a tenant record and link them to a unit. The tenant portal, rent collection, and maintenance tickets all flow from this."
          href="/dashboard/tenants"
          cta="Add tenant"
        />
        <EmptyCard
          title="Connect your bank"
          body="One Plaid connection lets Stripe Connect auto-debit rent from your tenants and deposit to your account."
          href="/dashboard/rent"
          cta="Connect bank"
        />
        <EmptyCard
          title="Post a vacancy"
          body="Publish a unit to Zillow and Apartments.com, capture inquiries, and run prospects through the pipeline."
          href="/dashboard/prospects"
          cta="Post vacancy"
        />
      </div>

      <div className="mt-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sprint 0 — scaffolding only
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This is the bootstrap build: auth works, the database schema is
          ready to apply, and the layout is in place. Properties, tenants,
          rent collection, maintenance, prospects, renewals, and financials
          come in subsequent sprints. See{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            README.md
          </code>{' '}
          for the sprint plan.
        </p>
      </div>
    </div>
  )
}

function EmptyCard({
  title,
  body,
  href,
  cta,
  primary = false,
}: {
  title: string
  body: string
  href: string
  cta: string
  primary?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <Link
        href={href}
        className={
          primary
            ? 'mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'
            : 'mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50'
        }
      >
        {cta} →
      </Link>
    </div>
  )
}
