import Link from 'next/link'
import { LeaseImportForm } from '@/app/ui/lease-import-form'

export default function LeaseImportPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/rent"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Rent
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Import leases from CSV
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bulk-add lease records. Each row references an existing tenant (by
          email) and an existing unit (by property name + unit_number).
          Download the template for the exact column layout.
        </p>
      </div>

      <LeaseImportForm />
    </div>
  )
}
