// ============================================================
// Prospect detail page — Screening card
// ============================================================
//
// Compact summary of the latest screening report for a prospect,
// with deep link to the full screening tab.

import Link from 'next/link'
import {
  SCREENING_RISK_BAND_LABELS,
  SCREENING_RISK_BAND_BADGE,
  SCREENING_REPORT_STATUS_LABELS,
  REPORT_STATUS_BADGE,
  type ScreeningReport,
} from '@/app/lib/schemas/screening'

export function ProspectScreeningCard({
  prospectId,
  latestReport,
  documentsCount,
}: {
  prospectId: string
  latestReport: ScreeningReport | null
  documentsCount: number
}) {
  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Application screening
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Forensic checks on uploaded documents. Findings only — never a
            decision.
          </p>
        </div>
        <Link
          href={`/dashboard/prospects/${prospectId}/screening`}
          className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          {latestReport ? 'View full report' : 'Open screening'}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-zinc-500">Documents uploaded</div>
          <div className="mt-0.5 font-semibold text-zinc-900">
            {documentsCount}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Latest report</div>
          <div className="mt-0.5">
            {latestReport ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_BADGE[latestReport.status]}`}
              >
                {SCREENING_REPORT_STATUS_LABELS[latestReport.status]}
              </span>
            ) : (
              <span className="text-zinc-400">No report yet</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Risk band</div>
          <div className="mt-0.5">
            {latestReport?.risk_band ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SCREENING_RISK_BAND_BADGE[latestReport.risk_band]}`}
              >
                {SCREENING_RISK_BAND_LABELS[latestReport.risk_band]}
              </span>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
