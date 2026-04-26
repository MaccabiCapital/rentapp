// ============================================================
// Dashboard → Screening → Audit log
// ============================================================
//
// Append-only event trail for every Proof Check action. Surfaces
// report_created, run_started, run_completed, run_failed,
// document_uploaded, document_deleted, decision_recorded,
// ai_summary_generated. 7-year retention horizon (FCRA standard).

import Link from 'next/link'
import { getScreeningAuditLog } from '@/app/lib/queries/screening'

const EVENT_BADGE: Record<string, string> = {
  report_created: 'bg-blue-100 text-blue-800',
  run_started: 'bg-blue-100 text-blue-800',
  run_completed: 'bg-emerald-100 text-emerald-800',
  run_failed: 'bg-red-100 text-red-800',
  document_uploaded: 'bg-zinc-100 text-zinc-700',
  document_deleted: 'bg-amber-100 text-amber-800',
  document_viewed: 'bg-zinc-100 text-zinc-600',
  decision_recorded: 'bg-indigo-100 text-indigo-800',
  ai_summary_generated: 'bg-purple-100 text-purple-800',
}

const EVENT_LABEL: Record<string, string> = {
  report_created: 'Report created',
  run_started: 'Run started',
  run_completed: 'Run completed',
  run_failed: 'Run failed',
  document_uploaded: 'Document uploaded',
  document_deleted: 'Document deleted',
  document_viewed: 'Document viewed',
  decision_recorded: 'Decision recorded',
  ai_summary_generated: 'AI summary generated',
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

export default async function ScreeningAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ prospectId?: string; reportId?: string }>
}) {
  const { prospectId, reportId } = await searchParams
  const events = await getScreeningAuditLog({
    prospectId,
    reportId,
    limit: 200,
  })

  const csvParams = new URLSearchParams()
  if (prospectId) csvParams.set('prospectId', prospectId)
  if (reportId) csvParams.set('reportId', reportId)
  const csvHref = `/dashboard/screening/audit/csv${
    csvParams.toString() ? `?${csvParams.toString()}` : ''
  }`

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Screening audit log
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Append-only record of every Proof Check action. Retained 7 years
            to match FCRA / ECOA standards. Fair-housing compliant — every
            decision is logged with the actor and timestamp.
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Export CSV
        </a>
      </div>

      {(prospectId || reportId) && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <span className="text-zinc-700">Filtered:</span>
          {prospectId && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              prospect {prospectId.slice(0, 8)}
            </span>
          )}
          {reportId && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              report {reportId.slice(0, 8)}
            </span>
          )}
          <Link
            href="/dashboard/screening/audit"
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-700"
          >
            Clear filters
          </Link>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-600">
          No screening events yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>When</Th>
                <Th>Event</Th>
                <Th>Actor</Th>
                <Th>Prospect / Report</Th>
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
                      {e.prospect_id && (
                        <Link
                          href={`/dashboard/prospects/${e.prospect_id}/screening`}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          {e.prospect_id.slice(0, 8)}
                        </Link>
                      )}
                      {e.report_id && (
                        <div className="text-zinc-500">
                          report {e.report_id.slice(0, 8)}
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
