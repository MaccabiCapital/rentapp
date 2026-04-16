// ============================================================
// Dashboard → Overview
// ============================================================
//
// Landing screen for signed-in landlords. Shows top-level
// counts across properties, units, tenants, maintenance, and
// prospects, plus a demo-data card so first-run users can
// populate a realistic portfolio with one click.

import Link from 'next/link'
import { getUser } from '@/lib/supabase/get-user'
import { getDashboardSummary } from '@/app/lib/queries/dashboard-summary'
import { hasDemoData } from '@/app/lib/queries/demo-status'
import { getUpcomingEvents } from '@/app/lib/queries/upcoming-events'
import { getInsuranceSummary } from '@/app/lib/queries/insurance'
import { DemoSeedButton } from '@/app/ui/demo-seed-button'
import { UpcomingEvents } from '@/app/ui/upcoming-events'

export default async function DashboardHome() {
  const [user, summary, demoLoaded, events, insurance] = await Promise.all([
    getUser(),
    getDashboardSummary(),
    hasDemoData(),
    getUpcomingEvents(),
    getInsuranceSummary(),
  ])

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'there'

  const isEmpty = summary.property_count === 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Welcome, {displayName}
        </h1>
        <p className="mt-2 text-zinc-600">
          {isEmpty
            ? "You haven't added any properties yet. Start with your first property below, or load demo data to see what the full app looks like."
            : 'Here is a quick look at your portfolio. Use the sidebar to drill into any module.'}
        </p>
      </div>

      {!isEmpty && events.length > 0 && (
        <div className="mb-10">
          <UpcomingEvents events={events} />
        </div>
      )}

      {!isEmpty && (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Properties"
            value={summary.property_count}
            href="/dashboard/properties"
          />
          <StatCard
            label="Units"
            value={summary.unit_count}
            subLabel={`${summary.occupied_unit_count} occupied · ${summary.vacant_unit_count} vacant`}
            href="/dashboard/properties"
          />
          <StatCard
            label="Tenants"
            value={summary.tenant_count}
            subLabel={`${summary.active_lease_count} active lease${summary.active_lease_count === 1 ? '' : 's'}`}
            href="/dashboard/tenants"
          />
          <StatCard
            label="Open maintenance"
            value={summary.open_maintenance_count}
            tone={summary.open_maintenance_count > 0 ? 'warning' : 'default'}
            href="/dashboard/maintenance"
          />
          <StatCard
            label="Active prospects"
            value={summary.active_prospect_count}
            subLabel={
              summary.overdue_followup_count > 0
                ? `${summary.overdue_followup_count} overdue follow-up${summary.overdue_followup_count === 1 ? '' : 's'}`
                : undefined
            }
            tone={summary.overdue_followup_count > 0 ? 'danger' : 'default'}
            href="/dashboard/prospects"
          />
          <StatCard
            label="Vacant units"
            value={summary.vacant_unit_count}
            tone={summary.vacant_unit_count > 0 ? 'warning' : 'default'}
            href="/dashboard/properties"
          />
          {insurance.total > 0 && (
            <StatCard
              label="Insurance"
              value={insurance.total}
              subLabel={
                insurance.expired > 0
                  ? `${insurance.expired} expired`
                  : insurance.expiringSoon > 0
                    ? `${insurance.expiringSoon} expiring in 60d`
                    : 'All current'
              }
              tone={
                insurance.expired > 0
                  ? 'danger'
                  : insurance.expiringSoon > 0
                    ? 'warning'
                    : 'default'
              }
              href="/dashboard/insurance"
            />
          )}
        </div>
      )}

      {isEmpty && (
        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          <EmptyCard
            title="Add your first property"
            body="Start by creating a property record — an address, a unit, and a monthly rent. Everything else builds from there."
            href="/dashboard/properties/new"
            cta="Add property"
            primary
          />
          <EmptyCard
            title="Add a tenant"
            body="Create a tenant record so you can link them to a unit with a lease. Leases automatically mark the unit as occupied."
            href="/dashboard/tenants/new"
            cta="Add tenant"
          />
          <EmptyCard
            title="Track a prospect"
            body="Log someone who inquired about a vacant unit and run them through the pipeline from inquired to lease signed."
            href="/dashboard/prospects/new"
            cta="Add prospect"
          />
          <EmptyCard
            title="Log an expense"
            body="Track insurance, mortgage interest, repairs, utilities, and every other Schedule E line item by property."
            href="/dashboard/financials/expenses/new"
            cta="Log expense"
          />
        </div>
      )}

      <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/40 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
              Demo data
            </h2>
            <p className="mt-2 text-sm text-zinc-700">
              Populate your account with a realistic 2-property portfolio:
              a duplex and a single-family home, 3 units, 3 tenants, 2 active
              leases, 4 maintenance requests across statuses, 3 prospects in
              different pipeline stages, 8 expenses, and 10 rent payments.
              Everything is tagged internally — remove it with one click.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Your real data is not touched. Only rows tagged &ldquo;[DEMO]&rdquo;
              are added or removed.
            </p>
          </div>
          <div className="md:pt-1">
            <DemoSeedButton hasDemoData={demoLoaded} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subLabel,
  tone = 'default',
  href,
}: {
  label: string
  value: number
  subLabel?: string
  tone?: 'default' | 'warning' | 'danger'
  href: string
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-orange-700'
        : 'text-zinc-900'
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className={`text-3xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-zinc-600">{label}</div>
      {subLabel && (
        <div className="mt-1 text-xs text-zinc-500">{subLabel}</div>
      )}
    </Link>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
      <Link
        href={href}
        className={
          primary
            ? 'mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700'
            : 'mt-4 inline-flex rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50'
        }
      >
        {cta} →
      </Link>
    </div>
  )
}
