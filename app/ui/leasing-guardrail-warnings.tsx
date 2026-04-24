// ============================================================
// Guardrail warning banners — inbound warnings + outbound flags
// ============================================================
//
// Server component — no interactivity needed. Renders the
// structured flags from leasing_messages.guardrail_flags in a
// compact, actionable way.

import type { GuardrailFlags } from '@/app/lib/leasing/fair-housing-guardrails'
import {
  INPUT_WARNING_LABELS,
  OUTPUT_FLAG_LABELS,
} from '@/app/lib/leasing/fair-housing-guardrails'

export function GuardrailWarnings({
  flags,
  variant,
}: {
  flags: GuardrailFlags
  variant: 'inbound' | 'outbound'
}) {
  const inputs = flags.input_warnings ?? []
  const outputs = flags.output_flags ?? []

  if (variant === 'inbound' && inputs.length === 0) return null
  if (variant === 'outbound' && outputs.length === 0) return null

  if (variant === 'inbound') {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
        <div className="font-semibold text-amber-900">
          Fair-housing heads-up
        </div>
        <ul className="mt-1 space-y-1 text-xs text-amber-900">
          {inputs.map((w, i) => (
            <li key={i}>
              <span className="font-medium">
                {INPUT_WARNING_LABELS[w.type]}:
              </span>{' '}
              {w.note}
              <span className="mt-0.5 block text-amber-700">
                (&ldquo;{w.match}&rdquo;)
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Outbound = stronger — red/orange, blocks send without override
  return (
    <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
      <div className="font-semibold text-red-900">
        Outbound message flagged
      </div>
      <ul className="mt-1 space-y-1 text-xs text-red-900">
        {outputs.map((o, i) => (
          <li key={i}>
            <span className="font-medium">{OUTPUT_FLAG_LABELS[o.type]}:</span>{' '}
            {o.note}
            <span className="mt-0.5 block text-red-700">
              (&ldquo;{o.match}&rdquo;)
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-800">
        Edit the message to remove flagged phrasing, or tick the override
        checkbox to send anyway.
      </p>
    </div>
  )
}
