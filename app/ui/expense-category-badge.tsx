import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/app/lib/schemas/expense'

const CATEGORY_CLASSES: Record<ExpenseCategory, string> = {
  advertising: 'bg-blue-100 text-blue-800',
  cleaning_maintenance: 'bg-orange-100 text-orange-800',
  commissions: 'bg-indigo-100 text-indigo-800',
  insurance: 'bg-cyan-100 text-cyan-800',
  legal_professional: 'bg-violet-100 text-violet-800',
  management_fees: 'bg-purple-100 text-purple-800',
  mortgage_interest: 'bg-red-100 text-red-800',
  other_interest: 'bg-pink-100 text-pink-800',
  repairs: 'bg-yellow-100 text-yellow-800',
  supplies: 'bg-emerald-100 text-emerald-800',
  taxes: 'bg-rose-100 text-rose-800',
  utilities: 'bg-green-100 text-green-800',
  depreciation: 'bg-zinc-100 text-zinc-700',
  other: 'bg-zinc-100 text-zinc-700',
}

export function ExpenseCategoryBadge({
  category,
}: {
  category: ExpenseCategory
}) {
  const classes = CATEGORY_CLASSES[category] ?? 'bg-zinc-100 text-zinc-700'
  const label = EXPENSE_CATEGORY_LABELS[category] ?? category
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
