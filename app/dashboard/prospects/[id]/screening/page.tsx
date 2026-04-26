// ============================================================
// Dashboard → Prospects → [id] → Screening
// ============================================================
//
// Full Proof Check view for one prospect:
//   - Documents (list + upload)
//   - Run / re-run report
//   - AI summary (stub for v1 — coming in Phase 8)
//   - Signals (grouped by severity)
//   - Decision bar (all 3 buttons always enabled — fair-housing rule)

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProspect } from '@/app/lib/queries/prospects'
import {
  getLatestScreeningReportForProspect,
  listApplicationDocuments,
  listScreeningSignals,
} from '@/app/lib/queries/screening'
import {
  APPLICATION_DOCUMENT_KIND_LABELS,
  SCREENING_RISK_BAND_LABELS,
  SCREENING_RISK_BAND_BADGE,
  SCREENING_REPORT_STATUS_LABELS,
  REPORT_STATUS_BADGE,
  SCREENING_SIGNAL_SEVERITY_LABELS,
  SCREENING_SIGNAL_SEVERITY_BADGE,
  SCREENING_SIGNAL_KIND_LABELS,
  formatBytes,
} from '@/app/lib/schemas/screening'
import { ProspectScreeningRunButton } from '@/app/ui/prospect-screening-run-button'
import { ProspectDocumentUploadForm } from '@/app/ui/prospect-document-upload-form'
import { ProspectDocumentDeleteButton } from '@/app/ui/prospect-document-delete-button'
import { ScreeningDecisionBar } from '@/app/ui/screening-decision-bar'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function ProspectScreeningPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [prospect, latestReport, documents] = await Promise.all([
    getProspect(id),
    getLatestScreeningReportForProspect(id),
    listApplicationDocuments(id),
  ])

  if (!prospect) notFound()

  const signals = latestReport
    ? await listScreeningSignals(latestReport.id)
    : []
  const redSignals = signals.filter((s) => s.severity === 'red')
  const amberSignals = signals.filter((s) => s.severity === 'amber')
  const greenSignals = signals.filter((s) => s.severity === 'green')

  const tenantName = `${prospect.first_name ?? ''} ${prospect.last_name ?? ''}`.trim() ||
    prospect.email ||
    prospect.phone ||
    'Unnamed prospect'

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/prospects" className="hover:text-zinc-900">
          Prospects
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/dashboard/prospects/${prospect.id}`}
          className="hover:text-zinc-900"
        >
          {tenantName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">Screening</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Application screening — {tenantName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Forensic checks on uploaded documents. Every signal is a
            review-prompt; the decision is always yours.
          </p>
        </div>
        <ProspectScreeningRunButton
          prospectId={prospect.id}
          existingReportId={latestReport?.id ?? null}
          isRunning={latestReport?.status === 'running'}
          documentsCount={documents.length}
        />
      </div>

      {/* Report status banner */}
      {latestReport && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_BADGE[latestReport.status]}`}
            >
              {SCREENING_REPORT_STATUS_LABELS[latestReport.status]}
            </span>
            {latestReport.risk_band && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SCREENING_RISK_BAND_BADGE[latestReport.risk_band]}`}
              >
                {SCREENING_RISK_BAND_LABELS[latestReport.risk_band]}
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {redSignals.length} red · {amberSignals.length} amber ·{' '}
              {greenSignals.length} verified
            </span>
            <span className="ml-auto text-xs text-zinc-500">
              Generated {formatDate(latestReport.created_at)}
            </span>
          </div>
        </div>
      )}

      {/* Section A: Documents */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Documents</h2>
          <span className="text-xs text-zinc-500">
            {documents.length} uploaded
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
            No documents uploaded yet. Use the form below to upload one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Type</Th>
                  <Th>Filename</Th>
                  <Th>Uploaded</Th>
                  <Th>Size</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {documents.map((d) => (
                  <tr key={d.id} className="even:bg-zinc-50/40">
                    <Td>
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {APPLICATION_DOCUMENT_KIND_LABELS[d.kind]}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm text-zinc-900">
                        {d.original_filename}
                      </span>
                    </Td>
                    <Td>{formatDate(d.uploaded_at)}</Td>
                    <Td>{formatBytes(d.byte_size)}</Td>
                    <Td>
                      <ProspectDocumentDeleteButton documentId={d.id} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <ProspectDocumentUploadForm prospectId={prospect.id} />
        </div>
      </section>

      {/* Section B: AI summary (Phase 8 stub) */}
      {latestReport && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">
            AI summary
          </h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                AI summary — recommendation only, never a decision
              </span>
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Live AI not configured — using rule-based template
              </span>
            </div>
            <div className="text-sm text-zinc-700">
              {latestReport.ai_summary ? (
                latestReport.ai_summary
                  .split('\n\n')
                  .map((para, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {para}
                    </p>
                  ))
              ) : (
                <p className="text-zinc-500">
                  AI summary will appear here once Phase 8 is shipped. The
                  deterministic signals below are already complete and
                  authoritative.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Section C: Signals */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Findings ({signals.length})
        </h2>

        {!latestReport ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
            No report yet. Upload at least one document and click{' '}
            <strong>Run Proof Check</strong>.
          </div>
        ) : signals.length === 0 ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-900">
            No red flags raised by the deterministic checks. Verify identity
            and references manually before approving.
          </div>
        ) : (
          <div className="space-y-2">
            {[...redSignals, ...amberSignals, ...greenSignals].map((s) => (
              <details
                key={s.id}
                className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <summary className="flex cursor-pointer items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SCREENING_SIGNAL_SEVERITY_BADGE[s.severity]}`}
                  >
                    {SCREENING_SIGNAL_SEVERITY_LABELS[s.severity]}
                  </span>
                  <span className="text-sm font-medium text-zinc-900">
                    {s.title}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">
                    {SCREENING_SIGNAL_KIND_LABELS[s.kind]}
                  </span>
                </summary>
                <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                  <p>{s.detail}</p>
                  {s.suggested_action && (
                    <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                      <strong>Suggested verification: </strong>
                      {s.suggested_action}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Decision bar */}
      {latestReport && (
        <ScreeningDecisionBar
          reportId={latestReport.id}
          currentDecision={latestReport.landlord_decision}
        />
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
