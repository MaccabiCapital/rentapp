import Link from 'next/link'
import { createTeamMember } from '@/app/actions/team'
import { TeamForm } from '@/app/ui/team-form'

export default function NewTeamMemberPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/settings/team"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to My Team
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Add team member
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Add someone you trust — your plumber, accountant, lawyer, insurance
          agent. You&rsquo;ll be able to assign them work from maintenance
          requests and auto-link expenses.
        </p>
      </div>
      <TeamForm action={createTeamMember} />
    </div>
  )
}
