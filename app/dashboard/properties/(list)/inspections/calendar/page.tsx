// ============================================================
// Dashboard → Inspections → Calendar
// ============================================================
//
// Combined upcoming view: scheduled inspections + recurring
// maintenance tasks, grouped by date in the next 60 days. Plus a
// "Recently completed" section for the last 30 days.

import Link from 'next/link'
import { getInspections } from '@/app/lib/queries/inspections'
import { listRecurringTasks } from '@/app/lib/queries/recurring-maintenance'
import { INSPECTION_TYPE_LABELS } from '@/app/lib/schemas/inspection'

const UPCOMING_WINDOW_DAYS = 60
const RECENT_WINDOW_DAYS = 30

type CalendarEntry = {
  date: string
  kind: 'inspection' | 'recurring'
  title: string
  subtitle: string | null
  href: string
  badge?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function dayLabel(iso: string): string {
  const today = todayIso()
  const tomorrow = daysFromNowIso(1)
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  return formatDate(iso)
}

export default async function InspectionsCalendarPage() {
  const [inspections, recurringTasks] = await Promise.all([
    getInspections(),
    listRecurringTasks({ status: 'active' }),
  ])

  const today = todayIso()
  const upcomingCutoff = daysFromNowIso(UPCOMING_WINDOW_DAYS)
  const recentCutoff = daysAgoIso(RECENT_WINDOW_DAYS)

  // Upcoming inspections (scheduled but not signed/completed)
  const upcomingInspections = inspections.filter(
    (i) =>
      i.scheduled_for !== null &&
      i.scheduled_for >= today &&
      i.scheduled_for <= upcomingCutoff &&
      i.status !== 'signed' &&
      i.status !== 'completed',
  )

  // Recurring tasks due within window
  const upcomingRecurring = recurringTasks.filter(
    (t) => t.next_due_date >= today && t.next_due_date <= upcomingCutoff,
  )

  // Combine + sort
  const upcomingEntries: CalendarEntry[] = [
    ...upcomingInspections.map((i) => ({
      date: i.scheduled_for as string,
      kind: 'inspection' as const,
      title: `${INSPECTION_TYPE_LABELS[i.type]} inspection`,
      subtitle: i.lease
        ? `${i.lease.unit?.property?.name ?? 'Property'} · ${i.lease.unit?.unit_number ?? 'Unit'} · ${i.lease.tenant?.first_name ?? ''} ${i.lease.tenant?.last_name ?? ''}`.trim()
        : null,
      href: `/dashboard/properties/inspections/${i.id}`,
      badge: i.status,
    })),
    ...upcomingRecurring.map((t) => ({
      date: t.next_due_date,
      kind: 'recurring' as const,
      title: t.title,
      subtitle: t.property
        ? t.property.name
        : t.unit
          ? `${t.unit.property?.name ?? 'Property'} · ${t.unit.unit_number ?? 'Unit'}`
          : null,
      href: `/dashboard/properties/maintenance/recurring/${t.id}`,
      badge: t.category ?? undefined,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  // Group by date
  const upcomingByDate = new Map<string, CalendarEntry[]>()
  for (const e of upcomingEntries) {
    if (!upcomingByDate.has(e.date)) upcomingByDate.set(e.date, [])
    upcomingByDate.get(e.date)!.push(e)
  }

  // Recently completed inspections
  const recentInspections = inspections
    .filter(
      (i) =>
        (i.status === 'signed' || i.status === 'completed') &&
        i.completed_at !== null &&
        i.completed_at.slice(0, 10) >= recentCutoff,
    )
    .sort(
      (a, b) =>
        (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
    )

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/properties/inspections"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← All inspections
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Inspection calendar
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Scheduled inspections + recurring maintenance tasks for the
            next {UPCOMING_WINDOW_DAYS} days, plus what was done in the
            last {RECENT_WINDOW_DAYS} days.
          </p>
        </div>
        <Link
          href="/dashboard/properties/inspections/new"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Schedule inspection
        </Link>
      </div>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Upcoming ({upcomingEntries.length})
        </h2>
        {upcomingByDate.size === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
            Nothing on the calendar in the next {UPCOMING_WINDOW_DAYS} days.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(upcomingByDate.entries()).map(([date, entries]) => (
              <div
                key={date}
                className="rounded-lg border border-zinc-200 bg-white shadow-sm"
              >
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-900">
                  {dayLabel(date)}
                </div>
                <ul className="divide-y divide-zinc-100">
                  {entries.map((e, i) => (
                    <li key={`${e.href}-${i}`}>
                      <Link
                        href={e.href}
                        className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-zinc-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                e.kind === 'inspection'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {e.kind === 'inspection' ? 'Inspection' : 'Recurring'}
                            </span>
                            <span className="text-sm font-medium text-zinc-900">
                              {e.title}
                            </span>
                          </div>
                          {e.subtitle && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {e.subtitle}
                            </p>
                          )}
                        </div>
                        {e.badge && (
                          <span className="text-xs text-zinc-400">
                            {e.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently completed */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Recently completed inspections ({recentInspections.length})
        </h2>
        {recentInspections.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
            No completed inspections in the last {RECENT_WINDOW_DAYS} days.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Type</Th>
                  <Th>Property / unit / tenant</Th>
                  <Th>Completed</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {recentInspections.map((i) => (
                  <tr key={i.id} className="even:bg-zinc-50/40">
                    <Td>{INSPECTION_TYPE_LABELS[i.type]}</Td>
                    <Td>
                      <Link
                        href={`/dashboard/properties/inspections/${i.id}`}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {i.lease?.unit?.property?.name ?? 'Property'} ·{' '}
                        {i.lease?.unit?.unit_number ?? 'Unit'}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {i.lease?.tenant?.first_name}{' '}
                        {i.lease?.tenant?.last_name}
                      </div>
                    </Td>
                    <Td>
                      {i.completed_at
                        ? formatDate(i.completed_at.slice(0, 10))
                        : '—'}
                    </Td>
                    <Td>{i.status}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
