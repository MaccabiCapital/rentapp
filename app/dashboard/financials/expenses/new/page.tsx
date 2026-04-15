import Link from 'next/link'
import { getProperties } from '@/app/lib/queries/properties'
import { getTeamMembersForPicker } from '@/app/lib/queries/team'
import { createExpense } from '@/app/actions/expenses'
import { ExpenseForm } from '@/app/ui/expense-form'

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>
}) {
  const { property: preselectedProperty } = await searchParams
  const [properties, teamOptions] = await Promise.all([
    getProperties(),
    // Everyone in your team — expenses can go to any vendor type
    getTeamMembersForPicker(),
  ])
  const propertyOptions = properties.map((p) => ({ id: p.id, name: p.name }))

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/financials"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to financials
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Log an expense
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Categories match Schedule E line items so your CSV export is ready
          for tax time.
        </p>
      </div>
      <ExpenseForm
        action={createExpense}
        propertyOptions={propertyOptions}
        defaultPropertyId={preselectedProperty ?? null}
        teamOptions={teamOptions}
      />
    </div>
  )
}
