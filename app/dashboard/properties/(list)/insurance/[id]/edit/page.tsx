import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInsurancePolicy } from '@/app/lib/queries/insurance'
import { getProperties } from '@/app/lib/queries/properties'
import { getTeamMembersForPicker } from '@/app/lib/queries/team'
import { updateInsurancePolicy } from '@/app/actions/insurance'
import { InsuranceForm } from '@/app/ui/insurance-form'

export default async function EditInsurancePolicyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [policy, properties, agents] = await Promise.all([
    getInsurancePolicy(id),
    getProperties(),
    getTeamMembersForPicker('insurance_agent'),
  ])
  if (!policy) notFound()

  const updateWithId = updateInsurancePolicy.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/properties/insurance/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to policy
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit insurance policy
        </h1>
      </div>
      <InsuranceForm
        action={updateWithId}
        defaultValues={policy}
        propertyOptions={properties.map((p) => ({ id: p.id, name: p.name }))}
        teamMemberOptions={agents.map((a) => ({
          id: a.id,
          display_name: a.display_name,
        }))}
      />
    </div>
  )
}
