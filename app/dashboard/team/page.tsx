// ============================================================
// Dashboard → My Team → list page
// ============================================================
//
// Lists every active + inactive team member grouped by role.
// Emergency bin at the top for 24/7 contacts.

import Link from 'next/link'
import { getTeamMembers } from '@/app/lib/queries/team'
import {
  ROLE_GROUPS,
  TEAM_ROLE_LABELS,
  displayTeamName,
  type TeamRole,
} from '@/app/lib/schemas/team'
import { TeamRoleBadge } from '@/app/ui/team-role-badge'

function formatCurrency(value: number | null) {
  if (value === null || value === 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function TeamPage() {
  const members = await getTeamMembers()

  if (members.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">My Team</h1>
            <p className="mt-1 text-sm text-zinc-600">
              The people and companies you trust: plumbers, lawyers,
              accountants, insurance agents — all in one place.
            </p>
          </div>
          <Link
            href="/dashboard/team/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add team member
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">
            Your team is empty
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Add your plumber, your accountant, your insurance agent. When a
            maintenance request comes in, you&rsquo;ll pick from this list
            instead of typing names from memory.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/team/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add your first team member
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const emergency = members.filter(
    (m) => m.is_active && m.available_24_7,
  )
  const active = members.filter((m) => m.is_active)
  const inactive = members.filter((m) => !m.is_active)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">My Team</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {active.length} active · {inactive.length} inactive ·{' '}
            {emergency.length} available 24/7
          </p>
        </div>
        <Link
          href="/dashboard/team/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add team member
        </Link>
      </div>

      {emergency.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">
            Emergency dispatch · 24/7
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {emergency.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/team/${m.id}`}
                className="flex items-start justify-between rounded-md border border-red-200 bg-white p-3 hover:border-red-400 hover:shadow-sm"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {displayTeamName(m)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">
                    {TEAM_ROLE_LABELS[m.role]}
                  </div>
                  {m.phone && (
                    <div className="mt-1 text-xs font-medium text-red-700">
                      {m.phone}
                    </div>
                  )}
                </div>
                {m.is_primary && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Primary
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {ROLE_GROUPS.map((group) => {
          const inGroup = active.filter((m) =>
            (group.roles as readonly TeamRole[]).includes(m.role),
          )
          if (inGroup.length === 0) return null
          return (
            <section key={group.label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                {group.label}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <Th>Name</Th>
                      <Th>Role</Th>
                      <Th>Contact</Th>
                      <Th>YTD spend</Th>
                      <Th>Specialty</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {inGroup.map((m) => (
                      <tr key={m.id} className="even:bg-zinc-50/40">
                        <Td>
                          <Link
                            href={`/dashboard/team/${m.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {displayTeamName(m)}
                          </Link>
                          {m.is_primary && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-800">
                              Primary
                            </span>
                          )}
                        </Td>
                        <Td>
                          <TeamRoleBadge role={m.role} />
                        </Td>
                        <Td>
                          <div className="text-xs text-zinc-600">
                            {m.phone ?? m.email ?? '—'}
                          </div>
                        </Td>
                        <Td>{formatCurrency(Number(m.total_spend_ytd))}</Td>
                        <Td className="text-xs text-zinc-500">
                          {m.specialty ?? '—'}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}

        {inactive.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Inactive
            </h2>
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/60 shadow-sm">
              <table className="min-w-full divide-y divide-zinc-200">
                <tbody className="divide-y divide-zinc-100">
                  {inactive.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        <Link
                          href={`/dashboard/team/${m.id}`}
                          className="text-sm text-zinc-600 hover:text-zinc-900"
                        >
                          {displayTeamName(m)}
                        </Link>
                      </Td>
                      <Td>
                        <TeamRoleBadge role={m.role} />
                      </Td>
                      <Td className="text-xs text-zinc-500">
                        {m.phone ?? m.email ?? '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
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

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-sm text-zinc-900 ${className ?? ''}`}>
      {children}
    </td>
  )
}
