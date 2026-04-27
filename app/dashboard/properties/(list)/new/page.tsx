import Link from 'next/link'
import { createProperty } from '@/app/actions/properties'
import { PropertyForm } from '@/app/ui/property-form'

export default function NewPropertyPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/properties"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to properties
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add property
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Enter the building or single-family home details. You&rsquo;ll add units next.
        </p>
      </div>
      <PropertyForm action={createProperty} />
    </div>
  )
}
