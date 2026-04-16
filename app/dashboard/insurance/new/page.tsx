import Link from 'next/link'
import { createInsurancePolicy } from '@/app/actions/insurance'
import { getProperties } from '@/app/lib/queries/properties'
import { getTeamMembersForPicker } from '@/app/lib/queries/team'
import { InsuranceForm } from '@/app/ui/insurance-form'

export default async function NewInsurancePolicyPage() {
  const [properties, agents] = await Promise.all([
    getProperties(),
    getTeamMembersForPicker('insurance_agent'),
  ])

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/insurance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Insurance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add insurance policy
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Log a policy and link it to one or more properties. An umbrella
          covering everything just checks all the property boxes.
        </p>
      </div>
      <InsuranceForm
        action={createInsurancePolicy}
        propertyOptions={properties.map((p) => ({ id: p.id, name: p.name }))}
        teamMemberOptions={agents.map((a) => ({
          id: a.id,
          display_name: a.display_name,
        }))}
      />
    </div>
  )
}
