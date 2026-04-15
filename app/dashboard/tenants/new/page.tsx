import Link from 'next/link'
import { createTenant } from '@/app/actions/tenants'
import { TenantForm } from '@/app/ui/tenant-form'

export default function NewTenantPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/tenants"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add tenant
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          You can link this tenant to a unit via a lease after saving.
        </p>
      </div>
      <TenantForm action={createTenant} />
    </div>
  )
}
