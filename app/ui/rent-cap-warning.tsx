// ============================================================
// RentCapWarning — shown on the lease edit page when the
// tenant's state has a statewide rent increase cap
// ============================================================
//
// Server-side computed since it has nothing interactive. If
// the state has no cap, returns null. Otherwise shows the
// formula + the max allowed rent given the current rent, plus
// the big "not legal advice — verify with attorney" footer.

import type { StateRentRule } from '@/app/lib/schemas/state-rules'
import {
  calculateMaxAllowedRent,
  verificationFreshness,
} from '@/app/lib/schemas/state-rules'

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function RentCapWarning({
  rule,
  currentRent,
  state,
}: {
  rule: StateRentRule | null
  currentRent: number
  state: string
}) {
  if (!rule || !rule.has_statewide_cap) {
    return null
  }

  const maxAllowed = calculateMaxAllowedRent(currentRent, rule)
  const freshness = verificationFreshness(rule.last_verified_on)

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-800"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {state} has a statewide rent increase cap
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {rule.max_annual_increase_formula}
          </p>
          {maxAllowed !== null && (
            <p className="mt-2 text-sm text-amber-900">
              Current rent: <span className="font-semibold">{formatCurrency(currentRent)}</span>
              {' · '}
              Max allowed under cap:{' '}
              <span className="font-semibold">{formatCurrency(maxAllowed)}</span>
            </p>
          )}
          {rule.has_city_rent_control && rule.city_rent_control_note && (
            <p className="mt-2 text-xs text-amber-900">
              <span className="font-semibold">Local rules may apply:</span>{' '}
              {rule.city_rent_control_note}
            </p>
          )}
          <p className="mt-3 text-xs text-amber-800">
            Reference only — not legal advice.
            {freshness === 'stale' && ' This data is 90-180 days old.'}
            {freshness === 'very-stale' && ' ⚠ This data is over 180 days old — verify with your attorney.'}
            {' '}
            {rule.source_url && (
              <a
                href={rule.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View official source →
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
