// ============================================================
// Dashboard → Maintenance → Recurring → [id] detail
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getRecurringTask,
  listCompletions,
} from '@/app/lib/queries/recurring-maintenance'
import { getProperties } from '@/app/lib/queries/properties'
import { getAllUnitsWithProperty } from '@/app/lib/queries/units'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE,
  daysUntil,
} from '@/app/lib/schemas/recurring-maintenance'
import { RecurringTaskForm } from '@/app/ui/recurring-task-form'
import { CompleteRecurringTaskForm } from '@/app/ui/complete-recurring-task-form'
import { RecurringTaskActions } from '@/app/ui/recurring-task-actions'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  )
}

export default async function RecurringTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [task, completions, properties, units] = await Promise.all([
    getRecurringTask(id),
    listCompletions(id),
    getProperties(),
    getAllUnitsWithProperty(),
  ])

  if (!task) notFound()

  const days = daysUntil(task.next_due_date)
  const isOverdue = days < 0 && task.status === 'active'
  const isSoon =
    days >= 0 && days <= task.lead_time_days && task.status === 'active'

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/maintenance/recurring"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Recurring maintenance
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {task.title}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[task.status]}`}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {task.property
              ? task.property.name
              : task.unit
                ? `${task.unit.property?.name ?? 'Property'} · ${task.unit.unit_number ?? 'Unit'}`
                : ''}
            {' · '}every {task.frequency_value} {task.frequency_unit}
          </p>
        </div>
        <RecurringTaskActions taskId={task.id} status={task.status} />
      </div>

      {/* Status banner */}
      <div
        className={`mb-6 rounded-md border p-4 text-sm ${
          isOverdue
            ? 'border-red-200 bg-red-50 text-red-900'
            : isSoon
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-blue-200 bg-blue-50 text-blue-900'
        }`}
      >
        <div className="font-semibold">
          {isOverdue ? 'Overdue' : isSoon ? 'Coming up' : 'Next due'}
        </div>
        <p className="mt-1">
          {formatDate(task.next_due_date)}
          {' · '}
          {isOverdue
            ? `${Math.abs(days)} days overdue`
            : `in ${days} day${days === 1 ? '' : 's'}`}
          {' · '}lead-time alert {task.lead_time_days} days before
        </p>
      </div>

      {/* Mark complete + form side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CompleteRecurringTaskForm taskId={task.id} />
        </div>

        <div className="lg:col-span-2">
          <RecurringTaskForm
            existing={task}
            propertyOptions={properties.map((p) => ({
              id: p.id,
              name: p.name,
            }))}
            unitOptions={units.map((u) => ({
              id: u.id,
              unit_number: u.unit_number,
              property_name: u.property?.name ?? 'Property',
            }))}
          />
        </div>
      </div>

      {/* Completion history */}
      {completions.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Completion history ({completions.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Vendor</Th>
                  <Th>Cost</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {completions.map((c) => (
                  <tr key={c.id}>
                    <Td>{formatDate(c.completed_on)}</Td>
                    <Td>{c.vendor_used ?? '—'}</Td>
                    <Td>
                      {c.cost_cents !== null
                        ? `$${(c.cost_cents / 100).toLocaleString()}`
                        : '—'}
                    </Td>
                    <Td>{c.notes ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600"
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-sm text-zinc-900">{children}</td>
  )
}
