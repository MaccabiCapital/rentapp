// ============================================================
// Dashboard → Compliance → Disparate impact
// ============================================================
//
// Bias-neutral cohort analysis of every Proof Check decision in
// the last 90 days. The engine ONLY reads non-PII signals
// (income band, risk band, application timing) — never name,
// email, phone, or address.

import Link from 'next/link'
import {
  getLatestDisparateImpactRun,
  listDisparateImpactRuns,
  listFindings,
} from '@/app/lib/queries/compliance'
import { DisparateImpactRunButton } from '@/app/ui/disparate-impact-run-button'

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
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type CohortStat = {
  dimension: string
  bucket: string
  total: number
  approvals: number
  rejections: number
  more_info: number
  approval_rate: number
}

const DIMENSION_LABELS: Record<string, string> = {
  income_band: 'Income band',
  risk_band: 'Proof Check risk band',
  application_timing: 'Application timing',
}

export default async function DisparateImpactPage() {
  const [latest, runs, openFindings] = await Promise.all([
    getLatestDisparateImpactRun(),
    listDisparateImpactRuns({ limit: 20 }),
    listFindings({ source: 'disparate_impact', status: 'open', limit: 50 }),
  ])

  const cohorts: CohortStat[] =
    latest && (latest.cohort_breakdowns as { stats?: CohortStat[] })?.stats
      ? ((latest.cohort_breakdowns as { stats: CohortStat[] }).stats ?? [])
      : []

  const baselineRate =
    latest && latest.decisions_total > 0
      ? Math.round((latest.approvals / latest.decisions_total) * 1000) / 10
      : null

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
            Disparate impact
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Bias-neutral cohort analysis of every screening decision in the
            last 90 days. The engine never reads name, email, phone, or
            address — only non-PII signals (income band, risk band,
            application timing).
          </p>
        </div>
        <DisparateImpactRunButton />
      </div>

      {!latest ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          No runs yet. Click <strong>Run now</strong> to analyze your last 90
          days. Auto-runs nightly at 03:00 UTC.
        </div>
      ) : (
        <>
          {/* Latest run summary */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  latest.status === 'complete'
                    ? 'bg-emerald-100 text-emerald-800'
                    : latest.status === 'partial'
                      ? 'bg-amber-100 text-amber-800'
                      : latest.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {latest.status}
              </span>
              <span className="text-zinc-700">
                Window: {formatDate(latest.window_start)} →{' '}
                {formatDate(latest.window_end)}
              </span>
              <span className="text-zinc-700">
                {latest.decisions_total} decisions
              </span>
              {baselineRate !== null && (
                <span className="text-zinc-700">
                  Baseline approval rate: {baselineRate}%
                </span>
              )}
              <span className="ml-auto text-xs text-zinc-500">
                Last run {formatDateTime(latest.completed_at)}
              </span>
            </div>
            {latest.error_text && (
              <p className="mt-2 text-xs text-red-600">
                Error: {latest.error_text}
              </p>
            )}
            {latest.status === 'partial' && (
              <p className="mt-2 text-xs text-amber-700">
                Need at least 10 decisions in the 90-day window before cohort
                analysis runs. You have {latest.decisions_total} so far.
              </p>
            )}
          </div>

          {/* Cohort breakdown */}
          {cohorts.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Cohort breakdown
              </h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <Th>Dimension</Th>
                      <Th>Cohort</Th>
                      <Th>Decisions</Th>
                      <Th>Approvals</Th>
                      <Th>Rejections</Th>
                      <Th>Approval rate</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {cohorts.map((c) => {
                      const divergence =
                        baselineRate !== null
                          ? Math.abs(c.approval_rate - baselineRate)
                          : 0
                      const isFlagged = divergence > 20
                      return (
                        <tr key={`${c.dimension}-${c.bucket}`}>
                          <Td>
                            <span className="text-xs text-zinc-600">
                              {DIMENSION_LABELS[c.dimension] ?? c.dimension}
                            </span>
                          </Td>
                          <Td>{c.bucket}</Td>
                          <Td>{c.total}</Td>
                          <Td>{c.approvals}</Td>
                          <Td>{c.rejections}</Td>
                          <Td>
                            <div
                              className={
                                isFlagged
                                  ? 'font-semibold text-red-700'
                                  : 'text-zinc-900'
                              }
                            >
                              {c.approval_rate}%
                              {isFlagged && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                  flagged
                                </span>
                              )}
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Open findings */}
          {openFindings.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Open findings ({openFindings.length})
              </h2>
              <div className="space-y-2">
                {openFindings.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm"
                  >
                    <div className="font-medium text-red-900">{f.title}</div>
                    <p className="mt-1 text-xs text-red-800">{f.detail}</p>
                    {f.suggested_fix && (
                      <p className="mt-1 text-xs text-red-700">
                        <strong>Suggested next step: </strong>
                        {f.suggested_fix}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent runs */}
          {runs.length > 1 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                Recent runs
              </h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <Th>Completed</Th>
                      <Th>Status</Th>
                      <Th>Window</Th>
                      <Th>Decisions</Th>
                      <Th>Findings (red)</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {runs.map((r) => (
                      <tr key={r.id}>
                        <Td>{formatDateTime(r.completed_at)}</Td>
                        <Td>{r.status}</Td>
                        <Td>
                          {formatDate(r.window_start)} → {formatDate(r.window_end)}
                        </Td>
                        <Td>{r.decisions_total}</Td>
                        <Td>{r.findings_red}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <details className="mt-6 rounded-md border border-zinc-200 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-700">
          How disparate-impact analysis works
        </summary>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-zinc-600">
          <li>
            Runs daily at 03:00 UTC. Click <em>Run now</em> to fire it
            immediately.
          </li>
          <li>
            Pulls every Proof Check decision (approved / rejected /
            requested-more-info) from the last 90 days.
          </li>
          <li>
            Buckets decisions into cohorts using <strong>only</strong>{' '}
            non-PII signals: income tertile, Proof Check risk band,
            application timing.
          </li>
          <li>
            Computes approval rate for each cohort and the cross-cohort
            baseline.
          </li>
          <li>
            Any cohort whose approval rate diverges by more than{' '}
            <strong>20 percentage points</strong> raises a red finding.
          </li>
          <li>
            Findings are not legal conclusions — they&rsquo;re prompts to
            verify the basis of decisions in the divergent cohort, document
            the rejection reason in legally-allowed terms, and consult an
            attorney if the pattern persists.
          </li>
          <li>
            <strong>Bias-neutrality:</strong> the engine never reads name,
            email, phone, address, or any proxy for protected classes. This
            is a load-bearing rule from FAIRSCREEN-SPEC §1.
          </li>
          <li>
            Minimum 10 decisions in the 90-day window before cohort analysis
            runs (smaller windows produce noise, not signal).
          </li>
        </ul>
      </details>
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
