import Link from 'next/link'
import { createNotice } from '@/app/actions/notices'
import { getLeasesForPicker } from '@/app/lib/queries/inspections'
import { NoticeNewForm } from '@/app/ui/notice-new-form'

export default async function NewNoticePage({
  searchParams,
}: {
  searchParams: Promise<{ leaseId?: string; type?: string }>
}) {
  const leases = await getLeasesForPicker()
  const params = await searchParams
  const initialLeaseId = params.leaseId
  const initialType = params.type

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/notices"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Notices
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Generate a notice
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pick a lease and a notice type. Fields below change based on your
          choice. The generated PDF carries a DRAFT banner.
        </p>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No leases yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            You need a lease in the system before you can generate a notice
            against it.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add a property
            </Link>
          </div>
        </div>
      ) : (
        <NoticeNewForm
          action={createNotice}
          leaseOptions={leases}
          initialLeaseId={initialLeaseId}
          initialType={initialType}
        />
      )}
    </div>
  )
}
