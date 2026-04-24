import Link from 'next/link'
import { createConversation } from '@/app/actions/leasing'
import { getProspectsForPicker } from '@/app/lib/queries/leasing'
import { LeasingNewForm } from '@/app/ui/leasing-new-form'

export default async function NewLeasingConversationPage() {
  const prospects = await getProspectsForPicker()
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/leasing-assistant"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Leasing assistant
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Start a new leasing conversation
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Paste a prospect inquiry and the assistant will help draft
          replies. You approve every message before it&rsquo;s sent.
        </p>
      </div>

      <LeasingNewForm
        action={createConversation}
        prospectOptions={prospects}
      />
    </div>
  )
}
