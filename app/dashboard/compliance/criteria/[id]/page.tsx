// ============================================================
// Dashboard → Compliance → Criteria → [id] → detail
// ============================================================
//
// View / edit form + publish action + PDF download + version
// history. Soft-delete from the action menu.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getCriteria,
  listCriteriaVersions,
  getStateFairHousingRule,
} from '@/app/lib/queries/compliance'
import { CriteriaForm } from '@/app/ui/criteria-form'
import { CriteriaPublishButton } from '@/app/ui/criteria-publish-button'
import { CriteriaRegenerateButton } from '@/app/ui/criteria-regenerate-button'
import { CriteriaDeleteButton } from '@/app/ui/criteria-delete-button'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CriteriaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [criteria, versions] = await Promise.all([
    getCriteria(id),
    listCriteriaVersions(id),
  ])

  if (!criteria) notFound()

  const rule = await getStateFairHousingRule(criteria.jurisdiction)

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/compliance/criteria"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All criteria
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {criteria.name}
            </h1>
            {criteria.is_published ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Published
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Draft
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {rule?.jurisdiction_name ?? criteria.jurisdiction}
            {criteria.published_at
              ? ` · published ${formatDate(criteria.published_at)}`
              : ''}
            {' · '}v{versions[0]?.version ?? 1}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criteria.pdf_storage_path && (
            <a
              href={`/dashboard/compliance/criteria/${criteria.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Download PDF
            </a>
          )}
          {criteria.is_published && (
            <CriteriaRegenerateButton criteriaId={criteria.id} />
          )}
          {!criteria.is_published && (
            <CriteriaPublishButton criteriaId={criteria.id} />
          )}
          <CriteriaDeleteButton criteriaId={criteria.id} />
        </div>
      </div>

      {/* Jurisdiction note */}
      {rule && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <strong>{rule.jurisdiction_name} reminder:</strong>{' '}
          {rule.protects_source_of_income
            ? 'Source of income is protected. Voucher acceptance is required by law.'
            : rule.soi_notes ??
              'Source of income is not statewide-protected — check local ordinances.'}
          {rule.fair_chance_housing_law && (
            <>
              {' '}
              {rule.fair_chance_notes ??
                'Fair-chance housing law applies; criminal history requires conditional offer + individualized assessment.'}
            </>
          )}
          {rule.max_application_fee_cents && (
            <> {rule.application_fee_notes}</>
          )}
        </div>
      )}

      {/* Form */}
      <CriteriaForm existing={criteria} />

      {/* Version history */}
      {versions.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Version history ({versions.length})
          </h2>
          <div className="space-y-1">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900">
                    v{v.version}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatDate(v.created_at)}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {v.pdf_storage_path ? 'PDF on file' : 'Snapshot only'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
