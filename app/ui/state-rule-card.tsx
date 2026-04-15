// ============================================================
// StateRuleCard — compact summary card for one state's rules
// ============================================================

import {
  daysSinceVerified,
  verificationFreshness,
  type StateRentRule,
} from '@/app/lib/schemas/state-rules'

export function StateRuleCard({ rule }: { rule: StateRentRule }) {
  const freshness = verificationFreshness(rule.last_verified_on)
  const days = daysSinceVerified(rule.last_verified_on)

  if (!rule.is_researched) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-700">
              {rule.state_name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {rule.state} · Coming soon
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            Not researched
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          This state&rsquo;s rules haven&rsquo;t been researched yet. Verify
          with a qualified attorney before acting on anything in this state.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {rule.state_name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">{rule.state}</p>
        </div>
        <FreshnessBadge freshness={freshness} days={days} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row
          label="Max annual increase"
          value={
            rule.has_statewide_cap
              ? rule.max_annual_increase_formula ??
                `${rule.max_annual_increase_percent}%`
              : 'No statewide cap'
          }
          emphasized={rule.has_statewide_cap}
        />
        {rule.increase_notice_days !== null && (
          <Row
            label="Rent increase notice"
            value={
              rule.increase_notice_days === 0
                ? 'No statutory requirement'
                : `${rule.increase_notice_days} days`
            }
          />
        )}
        {rule.no_cause_termination_notice_days !== null && (
          <Row
            label="No-cause termination"
            value={`${rule.no_cause_termination_notice_days} days notice`}
          />
        )}
        {rule.security_deposit_max_months !== null && (
          <Row
            label="Max security deposit"
            value={`${rule.security_deposit_max_months} month${
              rule.security_deposit_max_months === 1 ? '' : 's'
            } rent`}
          />
        )}
        {rule.security_deposit_return_days !== null && (
          <Row
            label="Deposit return within"
            value={`${rule.security_deposit_return_days} days`}
          />
        )}
        {rule.eviction_cure_period_days !== null && (
          <Row
            label="Eviction cure period"
            value={`${rule.eviction_cure_period_days} days`}
          />
        )}
      </dl>

      {rule.has_city_rent_control && rule.city_rent_control_note && (
        <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
          <span className="font-semibold">Local rent control exists.</span>{' '}
          {rule.city_rent_control_note}
        </div>
      )}

      {rule.notes && (
        <p className="mt-4 text-xs text-zinc-600">{rule.notes}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        {rule.source_url && (
          <a
            href={rule.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700"
          >
            {rule.source_title ?? 'Official source'} →
          </a>
        )}
        {rule.verified_by && <span>Verified by {rule.verified_by}</span>}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  emphasized = false,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd
        className={`text-right ${
          emphasized ? 'font-semibold text-zinc-900' : 'text-zinc-900'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function FreshnessBadge({
  freshness,
  days,
}: {
  freshness: 'fresh' | 'stale' | 'very-stale' | 'never'
  days: number | null
}) {
  if (freshness === 'never') {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
        Never verified
      </span>
    )
  }
  const label = days !== null ? `Verified ${days}d ago` : 'Verified'
  const classes = {
    fresh: 'bg-green-100 text-green-800',
    stale: 'bg-amber-100 text-amber-800',
    'very-stale': 'bg-red-100 text-red-800',
  }[freshness]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
