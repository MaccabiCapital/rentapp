// ============================================================
// Dashboard → Notices → list page
// ============================================================
//
// Every generated legal notice, newest first. Unserved notices
// carry an amber badge as a reminder to actually serve them.

import Link from 'next/link'
import { getNotices } from '@/app/lib/queries/notices'
import {
  NOTICE_TYPE_LABELS,
  NOTICE_METHOD_LABELS,
  type NoticeType,
} from '@/app/lib/schemas/notice'

function formatDate(iso: string | null) {
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

export default async function NoticesPage() {
  const notices = await getNotices()

  const emptyState = (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
      <h3 className="text-lg font-semibold text-zinc-900">No notices yet</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Generate a rent-increase letter, entry notice, late notice, pay-or-
        quit, or termination notice. Every notice is pre-filled from the lease
        and ships with a big yellow &ldquo;DRAFT — attorney review required&rdquo;
        banner on the PDF.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/notices/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Generate your first notice
        </Link>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Notices</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Generate, track, and download legal notices to your tenants.
          </p>
        </div>
        <Link
          href="/dashboard/notices/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Generate notice
        </Link>
      </div>

      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">DRAFT — attorney review required</div>
        <p className="mt-1 text-amber-800">
          The notices this feature generates are starting drafts pre-filled
          from your lease data. Before serving a notice on a tenant, have it
          reviewed by an attorney licensed in the property&rsquo;s state. State
          and local laws vary on required notice days, delivery methods, and
          content. Rentapp is not a law firm.
        </p>
      </div>

      {notices.length === 0 ? (
        emptyState
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Type</Th>
                <Th>Property / unit / tenant</Th>
                <Th>Generated</Th>
                <Th>Served</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {notices.map((n) => {
                const tenantName = n.lease?.tenant
                  ? `${n.lease.tenant.first_name} ${n.lease.tenant.last_name}`.trim()
                  : 'Unknown tenant'
                const unitLabel = n.lease?.unit?.unit_number ?? 'Unit'
                const propertyName = n.lease?.unit?.property?.name ?? 'Unknown property'
                return (
                  <tr key={n.id} className="even:bg-zinc-50/40">
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[n.type]}`}
                      >
                        {NOTICE_TYPE_LABELS[n.type]}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/notices/${n.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {propertyName} · {unitLabel}
                      </Link>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {tenantName}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-sm">{formatDate(n.generated_at)}</div>
                    </Td>
                    <Td>
                      {n.served_at ? (
                        <>
                          <div className="text-sm">
                            {formatDate(n.served_at)}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {n.served_method
                              ? NOTICE_METHOD_LABELS[n.served_method]
                              : ''}
                          </div>
                        </>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Not served yet
                        </span>
                      )}
                    </Td>
                  </tr>
                )
              })}
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
