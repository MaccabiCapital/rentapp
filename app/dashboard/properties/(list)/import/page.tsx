import Link from 'next/link'
import { PropertyImportForm } from '@/app/ui/property-import-form'

export default function PropertyImportPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/properties"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Properties
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Import properties from CSV
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bulk-add properties from a spreadsheet. Required columns:{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            name
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            street_address
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            city
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            state
          </code>{' '}
          (2-letter code),{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            postal_code
          </code>
          . Optional:{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            country
          </code>
          {' '}(default US),{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            property_type
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            year_built
          </code>
          ,{' '}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            notes
          </code>
          . You&rsquo;ll add units separately after properties exist.
        </p>
      </div>

      <PropertyImportForm />
    </div>
  )
}
