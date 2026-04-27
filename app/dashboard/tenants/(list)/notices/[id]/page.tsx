// ============================================================
// Dashboard → Notices → [id] detail page
// ============================================================
//
// Summary of a generated notice. Shows who/what/when, a button
// to download the PDF, and the mark-served workflow.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getNotice } from '@/app/lib/queries/notices'
import {
  NOTICE_TYPE_LABELS,
  NOTICE_METHOD_LABELS,
  parseNoticeData,
  type RentIncreaseData,
  type EntryData,
  type LateRentData,
  type CureOrQuitData,
  type TerminateTenancyData,
  type MoveOutInfoData,
  type NoticeType,
  ENTRY_REASON_LABELS,
  TERMINATE_REASON_LABELS,
  type EntryReason,
  type TerminateReason,
} from '@/app/lib/schemas/notice'
import { NoticeServedForm } from '@/app/ui/notice-served-form'
import { NoticeDeleteButton } from '@/app/ui/notice-delete-button'

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(n))
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TYPE_BADGE: Record<NoticeType, string> = {
  rent_increase: 'bg-indigo-100 text-indigo-800',
  entry: 'bg-zinc-100 text-zinc-700',
  late_rent: 'bg-amber-100 text-amber-800',
  cure_or_quit: 'bg-orange-100 text-orange-800',
  terminate_tenancy: 'bg-red-100 text-red-800',
  move_out_info: 'bg-blue-100 text-blue-800',
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const notice = await getNotice(id)
  if (!notice) notFound()

  let parsedData: unknown
  try {
    parsedData = parseNoticeData(notice.type, notice.data)
  } catch {
    parsedData = notice.data
  }

  const tenantName = notice.lease?.tenant
    ? `${notice.lease.tenant.first_name} ${notice.lease.tenant.last_name}`.trim()
    : 'Unknown tenant'
  const unitLabel = notice.lease?.unit?.unit_number ?? 'Unit'
  const propertyName = notice.lease?.unit?.property?.name ?? 'Unknown property'

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/tenants/notices"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Notices
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[notice.type]}`}
            >
              {NOTICE_TYPE_LABELS[notice.type]}
            </span>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              {propertyName} · {unitLabel}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Tenant: <span className="font-medium">{tenantName}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Generated {formatDate(notice.generated_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <a
              href={`/dashboard/tenants/notices/${notice.id}/pdf`}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Download PDF
            </a>
            <NoticeDeleteButton noticeId={notice.id} />
          </div>
        </div>
      </div>

      {/* DRAFT disclaimer */}
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">DRAFT — attorney review required</div>
        <p className="mt-1 text-amber-800">
          Before serving this notice, have it reviewed by an attorney licensed
          in the property&rsquo;s state. State laws vary on required notice
          days, delivery methods, and content.
        </p>
      </div>

      {/* Details section */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Notice details
        </h2>
        {notice.type === 'rent_increase' && (
          <RentIncreaseDetails data={parsedData as RentIncreaseData} />
        )}
        {notice.type === 'entry' && (
          <EntryDetails data={parsedData as EntryData} />
        )}
        {notice.type === 'late_rent' && (
          <LateRentDetails data={parsedData as LateRentData} />
        )}
        {notice.type === 'cure_or_quit' && (
          <CureOrQuitDetails data={parsedData as CureOrQuitData} />
        )}
        {notice.type === 'terminate_tenancy' && (
          <TerminateDetails data={parsedData as TerminateTenancyData} />
        )}
        {notice.type === 'move_out_info' && (
          <MoveOutInfoDetails data={parsedData as MoveOutInfoData} />
        )}
        {notice.notes && (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Internal notes
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
              {notice.notes}
            </p>
          </div>
        )}
      </div>

      {/* Served section */}
      <div className="mb-6">
        {notice.served_at && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Served on {formatDate(notice.served_at)}
            {notice.served_method && (
              <> via {NOTICE_METHOD_LABELS[notice.served_method]}</>
            )}
          </div>
        )}
        <NoticeServedForm
          noticeId={notice.id}
          defaultServedAt={notice.served_at?.slice(0, 10)}
          defaultMethod={notice.served_method ?? undefined}
          defaultNotes={notice.notes ?? undefined}
          alreadyServed={!!notice.served_at}
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Per-type detail renderers
// ------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-zinc-100 py-2 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900">{value}</dd>
    </div>
  )
}

function RentIncreaseDetails({ data }: { data: RentIncreaseData }) {
  return (
    <dl>
      <DetailRow
        label="Current rent"
        value={formatUSD(data.current_monthly_rent)}
      />
      <DetailRow label="New rent" value={formatUSD(data.new_monthly_rent)} />
      <DetailRow
        label="Effective date"
        value={formatDate(data.effective_date)}
      />
      {data.reason && <DetailRow label="Reason" value={data.reason} />}
    </dl>
  )
}

function EntryDetails({ data }: { data: EntryData }) {
  return (
    <dl>
      <DetailRow label="Date" value={formatDate(data.entry_date)} />
      <DetailRow
        label="Window"
        value={`${data.entry_time_start} – ${data.entry_time_end}`}
      />
      <DetailRow
        label="Reason"
        value={ENTRY_REASON_LABELS[data.reason as EntryReason]}
      />
      {data.details && <DetailRow label="Details" value={data.details} />}
    </dl>
  )
}

function LateRentDetails({ data }: { data: LateRentData }) {
  return (
    <dl>
      <DetailRow label="Rent amount" value={formatUSD(data.amount_due)} />
      <DetailRow
        label="Original due date"
        value={formatDate(data.original_due_date)}
      />
      {data.late_fee !== undefined && data.late_fee > 0 && (
        <DetailRow label="Late fee" value={formatUSD(data.late_fee)} />
      )}
      <DetailRow label="Total owed" value={formatUSD(data.total_owed)} />
    </dl>
  )
}

function CureOrQuitDetails({ data }: { data: CureOrQuitData }) {
  return (
    <dl>
      <DetailRow label="Amount due" value={formatUSD(data.amount_due)} />
      <DetailRow
        label="Deadline to pay"
        value={formatDate(data.cure_deadline_date)}
      />
    </dl>
  )
}

function TerminateDetails({ data }: { data: TerminateTenancyData }) {
  return (
    <dl>
      <DetailRow
        label="Termination date"
        value={formatDate(data.termination_date)}
      />
      <DetailRow
        label="Reason"
        value={TERMINATE_REASON_LABELS[data.reason as TerminateReason]}
      />
      {data.details && <DetailRow label="Details" value={data.details} />}
    </dl>
  )
}

function MoveOutInfoDetails({ data }: { data: MoveOutInfoData }) {
  return (
    <dl>
      <DetailRow
        label="Anticipated move-out"
        value={formatDate(data.anticipated_move_out_date)}
      />
      <DetailRow
        label="Showing notice"
        value={`${data.showing_notice_hours} hours' advance notice`}
      />
      {data.showings_policy && (
        <DetailRow label="Showings policy" value={data.showings_policy} />
      )}
      {data.move_out_day_instructions && (
        <DetailRow
          label="Move-out day"
          value={data.move_out_day_instructions}
        />
      )}
      {data.elevator_or_dock_booking && (
        <DetailRow
          label="Elevator / dock"
          value={data.elevator_or_dock_booking}
        />
      )}
      {data.keys_return_instructions && (
        <DetailRow
          label="Keys return"
          value={data.keys_return_instructions}
        />
      )}
      {data.utility_transfer_note && (
        <DetailRow
          label="Utilities + services"
          value={data.utility_transfer_note}
        />
      )}
      <DetailRow
        label="Forwarding address requested"
        value={data.forwarding_address_request ? 'Yes' : 'No'}
      />
    </dl>
  )
}
