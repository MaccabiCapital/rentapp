import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMaintenanceRequest } from '@/app/lib/queries/maintenance'
import { updateMaintenanceRequest } from '@/app/actions/maintenance'
import { MaintenanceForm } from '@/app/ui/maintenance-form'

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const request = await getMaintenanceRequest(id)
  if (!request) notFound()

  const updateWithId = updateMaintenanceRequest.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/maintenance/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to request
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit maintenance request
        </h1>
      </div>
      <MaintenanceForm
        action={updateWithId}
        defaultValues={request}
        mode="edit"
        submitLabel="Save changes"
      />
    </div>
  )
}
