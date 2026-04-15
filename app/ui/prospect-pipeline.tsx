// ============================================================
// ProspectPipeline — kanban-style column layout for the pipeline
// ============================================================
//
// Click-to-advance via the per-card buttons (see ProspectCard).
// Drag-and-drop is deferred to avoid pulling in a dnd library.

import {
  PIPELINE_STAGES,
  PROSPECT_STAGE_LABELS,
  type ProspectStage,
} from '@/app/lib/schemas/prospect'
import type { ProspectWithUnit } from '@/app/lib/queries/prospects'
import { ProspectCard } from './prospect-card'

export function ProspectPipeline({
  prospects,
  nowMs,
}: {
  prospects: ProspectWithUnit[]
  nowMs: number
}) {
  const byStage: Record<ProspectStage, ProspectWithUnit[]> = {
    inquired: [],
    application_sent: [],
    application_received: [],
    screening: [],
    approved: [],
    lease_signed: [],
    declined: [],
    withdrew: [],
  }
  for (const p of prospects) {
    byStage[p.stage].push(p)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex flex-col rounded-lg border border-zinc-200 bg-zinc-50/40 p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              {PROSPECT_STAGE_LABELS[stage]}
            </h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              {byStage[stage].length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {byStage[stage].length === 0 ? (
              <p className="text-center text-xs text-zinc-400">—</p>
            ) : (
              byStage[stage].map((p) => (
                <ProspectCard key={p.id} prospect={p} nowMs={nowMs} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProspectTerminalBins({
  prospects,
  nowMs,
}: {
  prospects: ProspectWithUnit[]
  nowMs: number
}) {
  const declined = prospects.filter((p) => p.stage === 'declined')
  const withdrew = prospects.filter((p) => p.stage === 'withdrew')
  if (declined.length === 0 && withdrew.length === 0) return null

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">
          Declined ({declined.length})
        </h3>
        <div className="flex flex-col gap-2">
          {declined.length === 0 ? (
            <p className="text-xs text-zinc-400">None</p>
          ) : (
            declined.map((p) => (
              <ProspectCard key={p.id} prospect={p} nowMs={nowMs} />
            ))
          )}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">
          Withdrew ({withdrew.length})
        </h3>
        <div className="flex flex-col gap-2">
          {withdrew.length === 0 ? (
            <p className="text-xs text-zinc-400">None</p>
          ) : (
            withdrew.map((p) => (
              <ProspectCard key={p.id} prospect={p} nowMs={nowMs} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
