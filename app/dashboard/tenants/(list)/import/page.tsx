import Link from 'next/link'
import { TenantImportForm } from '@/app/ui/tenant-import-form'

export default function TenantImportPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/tenants"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Import tenants from CSV
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bulk-add tenants from a spreadsheet. Required columns:{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            first_name
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            last_name
          </code>
          . Optional:{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            email
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            phone
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            date_of_birth
          </code>{' '}
          (YYYY-MM-DD),{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            emergency_contact_name
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            emergency_contact_phone
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            notes
          </code>
          . Download the template for an example.
        </p>
      </div>

      <TenantImportForm />
    </div>
  )
}
