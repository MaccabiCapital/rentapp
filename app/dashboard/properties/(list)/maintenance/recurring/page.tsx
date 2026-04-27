// ============================================================
// Dashboard → Maintenance → Recurring schedules
// ============================================================
//
// HVAC service every 6 months, smoke detector batteries every
// year, gutter cleaning every 6 months, etc. Things landlords
// should do but always forget.

import Link from 'next/link'
import { listRecurringTasks } from '@/app/lib/queries/recurring-maintenance'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE,
  daysUntil,
  type TaskStatus,
} from '@/app/lib/schemas/recurring-maintenance'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  )
}

export default async function RecurringMaintenancePage() {
  const tasks = await listRecurringTasks()

  const active = tasks.filter((t) => t.status === 'active')
  const paused = tasks.filter((t) => t.status === 'paused')
  const archived = tasks.filter((t) => t.status === 'archived')

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/properties/maintenance"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Maintenance
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Recurring maintenance
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            HVAC service, smoke detectors, gutters, pest control. Set the
            frequency once; the next-due date advances automatically each
            time you mark a task complete.
          </p>
        </div>
        <Link
          href="/dashboard/properties/maintenance/recurring/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            No recurring tasks yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Common starting set: HVAC service every 6 months, smoke
            detector battery yearly, gutters twice a year, water heater
            flush yearly, fire extinguisher inspection yearly.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/properties/maintenance/recurring/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add your first task
            </Link>
          </div>
        </div>
      ) : (
        <>
          <Section title="Active" status="active" tasks={active} />
          {paused.length > 0 && (
            <Section title="Paused" status="paused" tasks={paused} />
          )}
          {archived.length > 0 && (
            <Section title="Archived" status="archived" tasks={archived} />
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  status,
  tasks,
}: {
  title: string
  status: TaskStatus
  tasks: Awaited<ReturnType<typeof listRecurringTasks>>
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
        {title} ({tasks.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <Th>Task</Th>
              <Th>Property / unit</Th>
              <Th>Frequency</Th>
              <Th>Next due</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {tasks.map((t) => {
              const days = daysUntil(t.next_due_date)
              const isOverdue = days < 0
              const isSoon =
                days >= 0 && days <= t.lead_time_days && status === 'active'
              return (
                <tr key={t.id} className="even:bg-zinc-50/40">
                  <Td>
                    <Link
                      href={`/dashboard/properties/maintenance/recurring/${t.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {t.title}
                    </Link>
                    {t.category && (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {t.category}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {t.property
                      ? t.property.name
                      : t.unit
                        ? `${t.unit.property?.name ?? 'Property'} · ${t.unit.unit_number ?? 'Unit'}`
                        : '—'}
                  </Td>
                  <Td>
                    Every {t.frequency_value} {t.frequency_unit}
                  </Td>
                  <Td>
                    <div>{formatDate(t.next_due_date)}</div>
                    {status === 'active' && (
                      <div className="mt-0.5 text-xs">
                        {isOverdue ? (
                          <span className="text-red-700">
                            {Math.abs(days)} days overdue
                          </span>
                        ) : isSoon ? (
                          <span className="text-amber-700">
                            in {days} days
                          </span>
                        ) : (
                          <span className="text-zinc-500">in {days} days</span>
                        )}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_BADGE[t.status]}`}
                    >
                      {TASK_STATUS_LABELS[t.status]}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
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
