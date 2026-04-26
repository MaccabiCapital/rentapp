// ============================================================
// Deterministic risk band computation
// ============================================================
//
// Rules (NEVER change without founder + attorney review):
//   ≥1 red severity signal       → 'red'
//   ≥1 amber, 0 red              → 'amber'
//   otherwise                    → 'green'
//
// AI must NEVER feed into this function. The risk band is a
// deterministic projection of the engine's signal output.

import type {
  ScreeningRiskBand,
  ScreeningSignalSeverity,
} from '@/app/lib/schemas/screening'

export function computeRiskBand(
  severities: ScreeningSignalSeverity[],
): ScreeningRiskBand {
  if (severities.includes('red')) return 'red'
  if (severities.includes('amber')) return 'amber'
  return 'green'
}
