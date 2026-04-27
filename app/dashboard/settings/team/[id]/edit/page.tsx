import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTeamMember } from '@/app/lib/queries/team'
import { updateTeamMember } from '@/app/actions/team'
import { TeamForm } from '@/app/ui/team-form'

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = await getTeamMember(id)
  if (!member) notFound()

  const updateWithId = updateTeamMember.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/settings/team/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to team member
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Edit team member
        </h1>
      </div>
      <TeamForm action={updateWithId} defaultValues={member} />
    </div>
  )
}
