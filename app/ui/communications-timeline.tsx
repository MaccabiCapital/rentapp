// ============================================================
// Communications timeline — server component
// ============================================================
//
// Renders the reverse-chronological list of logged interactions
// for a single entity (tenant, prospect, team member, maintenance
// request, lease). Drop this inline into any detail page with:
//
//   <CommunicationsTimeline entityType="tenant" entityId={id} />

import { getCommunicationsForEntity } from '@/app/lib/queries/communications'
import type { CommEntityType } from '@/app/lib/schemas/communications'
import { CommunicationsTimelineItem } from './communications-timeline-item'
import { LogCommunicationForm } from './log-communication-form'
import { logCommunication } from '@/app/actions/communications'

export async function CommunicationsTimeline({
  entityType,
  entityId,
  heading = 'Communications',
  description = 'Calls, texts, emails, and notes.',
}: {
  entityType: CommEntityType
  entityId: string
  heading?: string
  description?: string
}) {
  const rows = await getCommunicationsForEntity(entityType, entityId)

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <span className="text-xs text-zinc-500">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-4">
        <LogCommunicationForm
          action={logCommunication}
          entityType={entityType}
          entityId={entityId}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/60 p-6 text-center text-sm text-zinc-600">
          No communications logged yet. Use the form above to log a call,
          text, email, or private note.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {rows.map((r) => (
            <CommunicationsTimelineItem key={r.id} entry={r} />
          ))}
        </ul>
      )}
    </section>
  )
}
