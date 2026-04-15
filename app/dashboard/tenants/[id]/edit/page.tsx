import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenant } from '@/app/lib/queries/tenants'
import { updateTenant } from '@/app/actions/tenants'
import { TenantForm } from '@/app/ui/tenant-form'

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenant = await getTenant(id)
  if (!tenant) notFound()

  const updateWithId = updateTenant.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/tenants/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to tenant
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit tenant
        </h1>
      </div>
      <TenantForm action={updateWithId} defaultValues={tenant} />
    </div>
  )
}
