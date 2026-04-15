import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getExpense } from '@/app/lib/queries/financials'
import { getProperties } from '@/app/lib/queries/properties'
import { updateExpense } from '@/app/actions/expenses'
import { ExpenseForm } from '@/app/ui/expense-form'

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [expense, properties] = await Promise.all([
    getExpense(id),
    getProperties(),
  ])
  if (!expense) notFound()

  const updateWithId = updateExpense.bind(null, id)
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
          Edit expense
        </h1>
      </div>
      <ExpenseForm
        action={updateWithId}
        defaultValues={expense}
        propertyOptions={propertyOptions}
        submitLabel="Save changes"
      />
    </div>
  )
}
