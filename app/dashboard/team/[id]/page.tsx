// ============================================================
// Dashboard → My Team → [id] detail page
// ============================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTeamMember, getTeamMemberUsage } from '@/app/lib/queries/team'
import {
  TEAM_ROLE_LABELS,
  PREFERRED_CONTACT_LABELS,
  displayTeamName,
} from '@/app/lib/schemas/team'
import { TeamRoleBadge } from '@/app/ui/team-role-badge'
import { ContactActions } from '@/app/ui/contact-actions'
import { DeleteTeamMemberButton } from '@/app/ui/delete-team-member-button'
import { CommunicationsTimeline } from '@/app/ui/communications-timeline'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = await getTeamMember(id)
  if (!member) notFound()

  const usage = await getTeamMemberUsage(id)
  const name = displayTeamName(member)

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">
        <Link href="/dashboard/team" className="hover:text-zinc-900">
          My Team
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TeamRoleBadge role={member.role} />
            {member.is_primary && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                Primary
              </span>
            )}
            {member.available_24_7 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                24/7 emergency
              </span>
            )}
            {!member.is_active && (
              <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Inactive
              </span>
            )}
          </div>
          {member.specialty && (
            <p className="mt-2 text-sm text-zinc-600">{member.specialty}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/dashboard/team/${member.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Link>
          <DeleteTeamMemberButton memberId={member.id} memberName={name} />
        </div>
      </div>

      {(member.phone || member.email) && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Contact
          </h2>
          <ContactActions
            member={member}
            logEntityType="team_member"
            logEntityId={member.id}
          />
        </div>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 md:grid-cols-2">
        <DetailRow label="Role" value={TEAM_ROLE_LABELS[member.role]} />
        <DetailRow
          label="Preferred contact"
          value={PREFERRED_CONTACT_LABELS[member.preferred_contact]}
        />
        <DetailRow label="Phone" value={member.phone} />
        <DetailRow label="Alt phone" value={member.alt_phone} />
        <DetailRow label="Email" value={member.email} />
        <DetailRow
          label="License"
          value={
            member.license_number
              ? `${member.license_number}${member.license_state ? ` · ${member.license_state}` : ''}`
              : null
          }
        />
        <DetailRow
          label="Hourly rate"
          value={
            member.hourly_rate !== null
              ? `${formatCurrency(Number(member.hourly_rate))}/hr`
              : null
          }
        />
        <DetailRow label="Rate notes" value={member.rate_notes} />
        <DetailRow label="Last used" value={formatDate(member.last_used_on)} />
        <DetailRow
          label="YTD jobs"
          value={member.total_jobs_ytd.toString()}
        />
        <DetailRow
          label="YTD spend"
          value={formatCurrency(Number(member.total_spend_ytd))}
        />
        <DetailRow label="Notes" value={member.notes} />
      </dl>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Usage history
          {usage.rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              · {formatCurrency(usage.total)} total
            </span>
          )}
        </h2>
      </div>

      {usage.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center">
          <p className="text-sm text-zinc-600">
            No expenses or maintenance jobs linked yet. When you log an
            expense with this person as the vendor, or assign a maintenance
            request to them, it&rsquo;ll show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <Th>Date</Th>
                <Th>Source</Th>
                <Th>Description</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {usage.rows.map((r) => (
                <tr key={`${r.source}-${r.id}`} className="even:bg-zinc-50/40">
                  <Td>{formatDate(r.date)}</Td>
                  <Td>
                    <span className="text-xs text-zinc-500">
                      {r.source === 'expense' ? 'Expense' : 'Maintenance'}
                    </span>
                  </Td>
                  <Td>{r.title}</Td>
                  <Td className="font-medium">{formatCurrency(r.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CommunicationsTimeline
        entityType="team_member"
        entityId={member.id}
        description="Calls, texts, and notes with this vendor."
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? '—'}</dd>
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
