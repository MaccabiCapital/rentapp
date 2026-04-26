// ============================================================
// Dashboard → Prospects → [id] → detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { now } from '@/app/lib/now'
import { getProspect } from '@/app/lib/queries/prospects'
import { ProspectStageBadge } from '@/app/ui/prospect-stage-badge'
import { ProspectStageButtons } from '@/app/ui/prospect-stage-buttons'
import { ConvertProspectButton } from '@/app/ui/convert-prospect-button'
import { DeleteProspectButton } from '@/app/ui/delete-prospect-button'
import { PROSPECT_SOURCE_LABELS } from '@/app/lib/schemas/prospect'
import { CommunicationsTimeline } from '@/app/ui/communications-timeline'
import { ProspectScreeningCard } from '@/app/ui/prospect-screening-card'
import {
  getLatestScreeningReportForProspect,
  listApplicationDocuments,
} from '@/app/lib/queries/screening'

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function displayName(p: {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}): string {
  const first = p.first_name?.trim()
  const last = p.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return p.email ?? p.phone ?? 'Unnamed prospect'
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prospect = await getProspect(id)
  if (!prospect) notFound()

  const [latestScreeningReport, screeningDocuments] = await Promise.all([
    getLatestScreeningReportForProspect(id),
    listApplicationDocuments(id),
  ])

  const nowMs = now()
  const name = displayName(prospect)
  const isActive =
    prospect.stage !== 'declined' &&
    prospect.stage !== 'withdrew' &&
    prospect.stage !== 'lease_signed'
  const isOverdue =
    isActive &&
    prospect.follow_up_at !== null &&
    new Date(prospect.follow_up_at).getTime() < nowMs

  const canConvert =
    prospect.stage === 'approved' || prospect.stage === 'lease_signed'

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/prospects" className="hover:text-zinc-900">
          Prospects
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <ProspectStageBadge stage={prospect.stage} />
            {prospect.source && (
              <span className="text-xs text-zinc-500">
                via{' '}
                {PROSPECT_SOURCE_LABELS[
                  prospect.source as keyof typeof PROSPECT_SOURCE_LABELS
                ] ?? prospect.source}
              </span>
            )}
          </div>
          {prospect.unit && (
            <p className="mt-2 text-sm text-zinc-600">
              Interested in{' '}
              <Link
                href={`/dashboard/properties/${prospect.unit.property_id}/units/${prospect.unit_id}`}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {prospect.unit.property.name}
                {prospect.unit.unit_number
                  ? ` · ${prospect.unit.unit_number}`
                  : ''}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href={`/dashboard/prospects/${prospect.id}/edit`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </Link>
          </div>
          <ProspectStageButtons
            prospectId={prospect.id}
            currentStage={prospect.stage}
          />
          {canConvert && prospect.unit_id && (
            <ConvertProspectButton
              prospectId={prospect.id}
              alreadyConverted={prospect.converted_to_tenant_id !== null}
            />
          )}
        </div>
      </div>

      {isOverdue && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Follow-up was due on {formatDateTime(prospect.follow_up_at)}.
        </div>
      )}

      <dl className="mt-8 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Email" value={prospect.email} />
        <DetailRow label="Phone" value={prospect.phone} />
        <DetailRow
          label="Inquired on"
          value={formatDateTime(prospect.created_at)}
        />
        <DetailRow
          label="Follow up by"
          value={formatDateTime(prospect.follow_up_at)}
        />
      </dl>

      {prospect.inquiry_message && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Inquiry message
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
            {prospect.inquiry_message}
          </p>
        </div>
      )}

      {prospect.notes && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">
            {prospect.notes}
          </p>
        </div>
      )}

      {prospect.converted_to_tenant_id && (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Converted to a tenant.{' '}
          <Link
            href={`/dashboard/tenants/${prospect.converted_to_tenant_id}`}
            className="font-medium underline"
          >
            View tenant →
          </Link>
        </div>
      )}

      <ProspectScreeningCard
        prospectId={prospect.id}
        latestReport={latestScreeningReport}
        documentsCount={screeningDocuments.length}
      />

      <div className="mt-6 flex justify-end">
        <DeleteProspectButton prospectId={prospect.id} prospectName={name} />
      </div>

      <CommunicationsTimeline
        entityType="prospect"
        entityId={prospect.id}
        description="Calls, texts, showings — everything you've logged with this prospect."
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? '—'}</dd>
    </div>
  )
}
