// ============================================================
// Dashboard → Leasing assistant → Audit log
// ============================================================
//
// Every fair-housing guardrail event across every conversation.
// Filterable by category and override status. Exportable as
// CSV for retention (3+ years per FCRA).

import Link from 'next/link'
import {
  getFairHousingAuditEvents,
  getAuditSummary,
  type AuditFlagCategory,
} from '@/app/lib/queries/fair-housing-audit'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US')
}

const CATEGORY_LABELS: Record<AuditFlagCategory, string> = {
  input_warning: 'Inbound warning',
  output_flag: 'Outbound flag',
}

const CATEGORY_BADGE: Record<AuditFlagCategory, string> = {
  input_warning: 'bg-amber-100 text-amber-800',
  output_flag: 'bg-red-100 text-red-800',
}

function parseCategoryParam(
  v: string | undefined,
): AuditFlagCategory | undefined {
  if (v === 'input_warning' || v === 'output_flag') return v
  return undefined
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    overrides?: string
    includeDeleted?: string
  }>
}) {
  const params = await searchParams
  const category = parseCategoryParam(params.category)
  const overridesOnly = params.overrides === 'true'
  const includeDeleted = params.includeDeleted === 'true'

  const [events, summary] = await Promise.all([
    getFairHousingAuditEvents({
      category,
      overridesOnly,
      includeDeleted,
    }),
    getAuditSummary({ includeDeleted }),
  ])

  const csvParams = new URLSearchParams()
  if (category) csvParams.set('category', category)
  if (overridesOnly) csvParams.set('overrides', 'true')
  if (includeDeleted) csvParams.set('includeDeleted', 'true')
  const csvHref = `/dashboard/leasing-assistant/audit/csv${
    csvParams.toString() ? `?${csvParams.toString()}` : ''
  }`

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/leasing-assistant"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Leasing assistant
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Fair-housing audit log
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Every guardrail event across every leasing conversation. Retain at
            least 3 years (FCRA). Export to CSV anytime.
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Export CSV
        </a>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total events" value={summary.total} />
        <SummaryCard label="Inbound warnings" value={summary.inputWarnings} />
        <SummaryCard
          label="Outbound flags"
          value={summary.outputFlags}
          tone={summary.outputFlags > 0 ? 'red' : undefined}
        />
        <SummaryCard
          label="Overrides applied"
          value={summary.overrides}
          tone={summary.overrides > 0 ? 'red' : undefined}
        />
      </div>

      {/* By-type breakdown */}
      {summary.byFlagType.length > 0 && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Events by flag type
          </h2>
          <div className="flex flex-wrap gap-2">
            {summary.byFlagType.map((f) => (
              <span
                key={f.type}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
              >
                <span className="font-medium">{f.label}</span>
                <span className="text-zinc-500">· {f.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Filter:
        </span>
        <FilterLink
          href="/dashboard/leasing-assistant/audit"
          active={!category && !overridesOnly}
          label="All"
        />
        <FilterLink
          href="/dashboard/leasing-assistant/audit?category=input_warning"
          active={category === 'input_warning'}
          label="Inbound only"
        />
        <FilterLink
          href="/dashboard/leasing-assistant/audit?category=output_flag"
          active={category === 'output_flag'}
          label="Outbound only"
        />
        <FilterLink
          href="/dashboard/leasing-assistant/audit?overrides=true"
          active={overridesOnly}
          label="Overrides only"
        />
        <span className="ml-auto text-xs text-zinc-500">
          Showing {events.length}{' '}
          {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No events match
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Either nothing&rsquo;s tripped a guardrail yet, or your filter
            excludes everything. Try removing the filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>When</Th>
                <Th>Conversation</Th>
                <Th>Category</Th>
                <Th>Flag</Th>
                <Th>Match / excerpt</Th>
                <Th>Override?</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {events.map((e, idx) => (
                <tr
                  key={`${e.message_id}-${e.flag_type}-${idx}`}
                  className="even:bg-zinc-50/40"
                >
                  <Td>
                    <div className="text-xs text-zinc-700">
                      {formatDateTime(e.timestamp)}
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/leasing-assistant/${e.conversation_id}`}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      {e.conversation_name}
                    </Link>
                    {e.prospect_contact && (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {e.prospect_contact}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[e.flag_category]}`}
                    >
                      {CATEGORY_LABELS[e.flag_category]}
                    </span>
                  </Td>
                  <Td>
                    <div className="text-sm font-medium text-zinc-900">
                      {e.flag_label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {e.flag_note}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-xs text-zinc-900">
                      &ldquo;{e.matched_text}&rdquo;
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {e.content_excerpt}
                    </div>
                  </Td>
                  <Td>
                    {e.override_applied ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Override applied
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </Td>
                </tr>
              ))}
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
  tone?: 'red'
}) {
  const color =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
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

function FilterLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        active
          ? 'bg-indigo-600 text-white'
          : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {label}
    </Link>
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
