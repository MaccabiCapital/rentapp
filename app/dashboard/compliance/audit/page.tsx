// ============================================================
// Dashboard → Compliance → Audit log
// ============================================================
//
// Append-only event trail across the entire compliance domain:
// listing scans, criteria publishes, finding actions, DI runs.
// 7-year retention horizon (FCRA + ECOA standards).

import Link from 'next/link'
import { getComplianceAuditLog } from '@/app/lib/queries/compliance'

const EVENT_BADGE: Record<string, string> = {
  listing_scanned: 'bg-blue-100 text-blue-800',
  criteria_created: 'bg-zinc-100 text-zinc-700',
  criteria_edited: 'bg-zinc-100 text-zinc-700',
  criteria_published: 'bg-emerald-100 text-emerald-800',
  finding_acknowledged: 'bg-blue-100 text-blue-800',
  finding_fixed: 'bg-emerald-100 text-emerald-800',
  finding_dismissed: 'bg-amber-100 text-amber-800',
  di_run_completed: 'bg-emerald-100 text-emerald-800',
  di_run_partial: 'bg-amber-100 text-amber-800',
  di_run_failed: 'bg-red-100 text-red-800',
  question_validated: 'bg-blue-100 text-blue-800',
  message_scanned: 'bg-blue-100 text-blue-800',
}

const EVENT_LABEL: Record<string, string> = {
  listing_scanned: 'Listing scanned',
  criteria_created: 'Criteria created',
  criteria_edited: 'Criteria edited',
  criteria_published: 'Criteria published',
  finding_acknowledged: 'Finding acknowledged',
  finding_fixed: 'Finding fixed',
  finding_dismissed: 'Finding dismissed',
  di_run_completed: 'Disparate-impact run completed',
  di_run_partial: 'Disparate-impact run (partial)',
  di_run_failed: 'Disparate-impact run failed',
  question_validated: 'Application question validated',
  message_scanned: 'Outbound message scanned',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function ComplianceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    findingId?: string
    criteriaId?: string
    diRunId?: string
  }>
}) {
  const { findingId, criteriaId, diRunId } = await searchParams
  const events = await getComplianceAuditLog({
    findingId,
    criteriaId,
    diRunId,
    limit: 500,
  })

  const csvParams = new URLSearchParams()
  if (findingId) csvParams.set('findingId', findingId)
  if (criteriaId) csvParams.set('criteriaId', criteriaId)
  if (diRunId) csvParams.set('diRunId', diRunId)
  const csvHref = `/dashboard/compliance/audit/csv${
    csvParams.toString() ? `?${csvParams.toString()}` : ''
  }`

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/compliance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Compliance
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Compliance audit log
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Append-only record across the entire compliance module —
            listing scans, criteria publishes, finding actions,
            disparate-impact runs. 7-year retention to match FCRA / ECOA.
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Export CSV
        </a>
      </div>

      {(findingId || criteriaId || diRunId) && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <span className="text-zinc-700">Filtered:</span>
          {findingId && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              finding {findingId.slice(0, 8)}
            </span>
          )}
          {criteriaId && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              criteria {criteriaId.slice(0, 8)}
            </span>
          )}
          {diRunId && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              DI run {diRunId.slice(0, 8)}
            </span>
          )}
          <Link
            href="/dashboard/compliance/audit"
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-700"
          >
            Clear filters
          </Link>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-600">
          No compliance events yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>When</Th>
                <Th>Event</Th>
                <Th>Actor</Th>
                <Th>Subject</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {events.map((e) => (
                <tr key={e.id} className="even:bg-zinc-50/40">
                  <Td>
                    <div className="text-xs text-zinc-700">
                      {formatDateTime(e.created_at)}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_BADGE[e.event] ?? 'bg-zinc-100 text-zinc-700'}`}
                    >
                      {EVENT_LABEL[e.event] ?? e.event}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-zinc-700">
                      {e.actor_kind}
                    </span>
                  </Td>
                  <Td>
                    <div className="space-y-0.5 text-xs">
                      {e.finding_id && (
                        <div className="text-zinc-600">
                          finding {e.finding_id.slice(0, 8)}
                        </div>
                      )}
                      {e.criteria_id && (
                        <Link
                          href={`/dashboard/compliance/criteria/${e.criteria_id}`}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          criteria {e.criteria_id.slice(0, 8)}
                        </Link>
                      )}
                      {e.di_run_id && (
                        <div className="text-zinc-600">
                          DI run {e.di_run_id.slice(0, 8)}
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <pre className="max-w-md whitespace-pre-wrap break-words text-xs text-zinc-600">
                      {e.event_data
                        ? JSON.stringify(e.event_data, null, 0)
                        : ''}
                    </pre>
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
