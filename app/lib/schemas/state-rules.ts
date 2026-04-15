// ============================================================
// State rent rules — schema types + helpers
// ============================================================

export type StateRentRule = {
  id: string
  state: string
  state_name: string
  max_annual_increase_percent: number | null
  max_annual_increase_formula: string | null
  has_statewide_cap: boolean
  increase_notice_days: number | null
  no_cause_termination_notice_days: number | null
  tenant_notice_days: number | null
  security_deposit_max_months: number | null
  security_deposit_return_days: number | null
  late_fee_max_percent: number | null
  late_fee_grace_days_min: number | null
  eviction_cure_period_days: number | null
  has_city_rent_control: boolean
  city_rent_control_note: string | null
  source_url: string | null
  source_title: string | null
  effective_date: string | null
  last_verified_on: string | null
  verified_by: string | null
  is_researched: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// Returns 'fresh' (<90 days), 'stale' (90-180), 'very-stale' (>180), or 'never'
export function verificationFreshness(
  lastVerifiedOn: string | null,
): 'fresh' | 'stale' | 'very-stale' | 'never' {
  if (!lastVerifiedOn) return 'never'
  const verified = new Date(lastVerifiedOn).getTime()
  const now = Date.now()
  const days = Math.floor((now - verified) / (1000 * 60 * 60 * 24))
  if (days < 90) return 'fresh'
  if (days < 180) return 'stale'
  return 'very-stale'
}

// Calculate the max allowed monthly rent under the state cap,
// given the current rent. Returns null if no statewide cap.
export function calculateMaxAllowedRent(
  currentRent: number,
  rule: StateRentRule,
): number | null {
  if (!rule.has_statewide_cap || rule.max_annual_increase_percent === null) {
    return null
  }
  const multiplier = 1 + rule.max_annual_increase_percent / 100
  return Math.round(currentRent * multiplier * 100) / 100
}

// Days-since-verification helper for the UI badge
export function daysSinceVerified(
  lastVerifiedOn: string | null,
): number | null {
  if (!lastVerifiedOn) return null
  const verified = new Date(lastVerifiedOn).getTime()
  return Math.floor((Date.now() - verified) / (1000 * 60 * 60 * 24))
}
