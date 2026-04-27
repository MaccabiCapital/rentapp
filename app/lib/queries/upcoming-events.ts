// ============================================================
// Upcoming events — the "what needs attention" feed on /dashboard
// ============================================================
//
// Server-side aggregation of actionable items from across the app.
// No separate table, no cron — this is a live query of data that
// already exists.
//
// Event sources (all RLS-scoped to the current user):
//   1. lease_expiring_soon    — active lease, end_date within 30d
//   2. tenant_gave_notice     — active lease with tenant_notice_given_on
//   3. overdue_followup       — prospect with follow_up_at < now() + active stage
//   4. urgent_maintenance     — open or in-progress high/emergency request
//   5. vacant_no_listing      — vacant unit without an active listing
//   6. stale_compliance       — portfolio state with last_verified_on > 90d ago
//   7. insurance_renewal      — policy expiring within 60d (Sprint 12 A)
//   8. rent_overdue           — rent_schedule past due and not fully paid (Sprint 12 B)
//   9. triage_inbox           — unresolved inbound SMS awaiting assignment (Sprint 13c)

import { createServerClient } from '@/lib/supabase/server'
import { now } from '@/app/lib/now'

export type EventSeverity = 'red' | 'amber' | 'blue'

export type UpcomingEvent = {
  id: string // source-type + entity id, for stable keys
  severity: EventSeverity
  icon: string // emoji or short string
  title: string
  subtitle: string
  href: string
  sort_rank: number // lower = more urgent
}

export async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  const supabase = await createServerClient()
  const nowMs = now()
  const nowIso = new Date(nowMs).toISOString()
  const in30 = new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const ninetyDaysAgo = new Date(nowMs - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const events: UpcomingEvent[] = []

  // ------------------------------------------------------------
  // 1. Leases expiring in the next 30 days (not including those
  //    where the tenant has given notice — those are handled by #2)
  // ------------------------------------------------------------
  const { data: expiringLeases } = await supabase
    .from('leases')
    .select(
      'id, end_date, monthly_rent, tenant:tenants(first_name, last_name), unit:units(unit_number, property:properties(name))',
    )
    .is('deleted_at', null)
    .eq('status', 'active')
    .is('tenant_notice_given_on', null)
    .lte('end_date', in30)
    .order('end_date', { ascending: true })

  for (const row of expiringLeases ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const daysUntil = Math.floor(
      (new Date(r.end_date).getTime() - nowMs) / (1000 * 60 * 60 * 24),
    )
    const tenantName = r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`
      : 'Tenant'
    const unitLabel = r.unit?.property?.name
      ? `${r.unit.property.name}${r.unit.unit_number ? ` · ${r.unit.unit_number}` : ''}`
      : 'Unit'
    const severity: EventSeverity = daysUntil < 0 ? 'red' : 'amber'
    events.push({
      id: `lease-expiring-${r.id}`,
      severity,
      icon: '↻',
      title:
        daysUntil < 0
          ? `Lease with ${tenantName} expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`
          : `${tenantName}'s lease expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      subtitle: unitLabel,
      href: '/dashboard/tenants/renewals',
      sort_rank: daysUntil, // negative = overdue, sorts first
    })
  }

  // ------------------------------------------------------------
  // 2. Tenants who gave notice
  // ------------------------------------------------------------
  const { data: noticeLeases } = await supabase
    .from('leases')
    .select(
      'id, end_date, tenant_notice_given_on, tenant:tenants(first_name, last_name), unit:units(unit_number, property:properties(name))',
    )
    .is('deleted_at', null)
    .eq('status', 'active')
    .not('tenant_notice_given_on', 'is', null)
    .order('tenant_notice_given_on', { ascending: false })

  for (const row of noticeLeases ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const tenantName = r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`
      : 'Tenant'
    const unitLabel = r.unit?.property?.name
      ? `${r.unit.property.name}${r.unit.unit_number ? ` · ${r.unit.unit_number}` : ''}`
      : 'Unit'
    const endDate = new Date(r.end_date)
    const daysToMoveOut = Math.floor(
      (endDate.getTime() - nowMs) / (1000 * 60 * 60 * 24),
    )
    events.push({
      id: `notice-${r.id}`,
      severity: 'red',
      icon: '⚠',
      title: `${tenantName} gave notice`,
      subtitle: `${unitLabel} · vacating in ${daysToMoveOut} day${daysToMoveOut === 1 ? '' : 's'} — prep for turnover`,
      href: '/dashboard/tenants/renewals',
      sort_rank: -1000, // always top
    })
  }

  // ------------------------------------------------------------
  // 3. Overdue prospect follow-ups
  // ------------------------------------------------------------
  const { data: overdueProspects } = await supabase
    .from('prospects')
    .select('id, first_name, last_name, follow_up_at, stage')
    .is('deleted_at', null)
    .lt('follow_up_at', nowIso)
    .not('follow_up_at', 'is', null)
    .in('stage', [
      'inquired',
      'application_sent',
      'application_received',
      'screening',
      'approved',
    ])
    .order('follow_up_at', { ascending: true })

  for (const row of overdueProspects ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const followUpMs = new Date(r.follow_up_at).getTime()
    const daysOverdue = Math.floor((nowMs - followUpMs) / (1000 * 60 * 60 * 24))
    const name =
      r.first_name || r.last_name
        ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
        : 'Prospect'
    events.push({
      id: `followup-${r.id}`,
      severity: 'red',
      icon: '→',
      title: `Follow up with ${name}`,
      subtitle:
        daysOverdue === 0
          ? `Due today · ${r.stage.replace(/_/g, ' ')}`
          : `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue · ${r.stage.replace(/_/g, ' ')}`,
      href: `/dashboard/prospects/${r.id}`,
      sort_rank: -daysOverdue, // more overdue = more urgent
    })
  }

  // ------------------------------------------------------------
  // 4. Urgent maintenance — high or emergency, not resolved/closed
  // ------------------------------------------------------------
  const { data: urgentMaint } = await supabase
    .from('maintenance_requests')
    .select(
      'id, title, urgency, status, created_at, unit:units(unit_number, property:properties(name))',
    )
    .in('urgency', ['high', 'emergency'])
    .in('status', ['open', 'assigned', 'in_progress', 'awaiting_parts'])
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })

  for (const row of urgentMaint ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const age = Math.floor(
      (nowMs - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    const unitLabel = r.unit?.property?.name
      ? `${r.unit.property.name}${r.unit.unit_number ? ` · ${r.unit.unit_number}` : ''}`
      : 'Unit'
    const severity: EventSeverity = r.urgency === 'emergency' ? 'red' : 'amber'
    events.push({
      id: `maint-${r.id}`,
      severity,
      icon: '⚙',
      title: `${r.urgency === 'emergency' ? 'Emergency' : 'Urgent'}: ${r.title}`,
      subtitle:
        age === 0
          ? `${unitLabel} · reported today`
          : `${unitLabel} · reported ${age} day${age === 1 ? '' : 's'} ago`,
      href: `/dashboard/properties/maintenance/${r.id}`,
      sort_rank: r.urgency === 'emergency' ? -500 - age : -100 - age,
    })
  }

  // ------------------------------------------------------------
  // 5. Vacant units with no active listing
  // ------------------------------------------------------------
  const { data: vacantUnits } = await supabase
    .from('units')
    .select(
      'id, unit_number, property_id, property:properties(name), listings(id, is_active, deleted_at)',
    )
    .is('deleted_at', null)
    .eq('status', 'vacant')

  for (const row of vacantUnits ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const activeListings = (
      (r.listings as Array<{
        id: string
        is_active: boolean
        deleted_at: string | null
      }>) ?? []
    ).filter((l) => l.is_active && l.deleted_at === null)
    if (activeListings.length > 0) continue

    const unitLabel = r.property?.name
      ? `${r.property.name}${r.unit_number ? ` · ${r.unit_number}` : ''}`
      : 'Unit'
    events.push({
      id: `vacant-no-listing-${r.id}`,
      severity: 'amber',
      icon: '◎',
      title: `Create a listing for ${unitLabel}`,
      subtitle:
        'This unit is vacant but has no public landing page. Share a URL on Zillow or Craigslist to start collecting inquiries.',
      href: `/dashboard/listings/new?property=${r.property_id}&unit=${r.id}`,
      sort_rank: 100,
    })
  }

  // ------------------------------------------------------------
  // 6. Stale compliance data in portfolio states
  // ------------------------------------------------------------
  const { data: propsForStates } = await supabase
    .from('properties')
    .select('state')
    .is('deleted_at', null)
  const portfolioStates = Array.from(
    new Set(
      (propsForStates ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) =>
          typeof p.state === 'string' ? p.state.trim().toUpperCase() : null,
        )
        .filter((s): s is string => typeof s === 'string' && s.length > 0),
    ),
  )

  if (portfolioStates.length > 0) {
    const { data: staleRules } = await supabase
      .from('state_rent_rules')
      .select('state, state_name, last_verified_on, is_researched')
      .in('state', portfolioStates)
      .eq('is_researched', true)
      .lt('last_verified_on', ninetyDaysAgo)

    for (const row of staleRules ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any
      const age = r.last_verified_on
        ? Math.floor(
            (nowMs - new Date(r.last_verified_on).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999
      events.push({
        id: `stale-compliance-${r.state}`,
        severity: 'blue',
        icon: '§',
        title: `${r.state_name} rent rules haven't been reviewed in ${age} days`,
        subtitle:
          'Compliance data gets stale — verify with your attorney before acting on renewal or termination notices.',
        href: '/dashboard/compliance',
        sort_rank: 500,
      })
    }
  }

  // ------------------------------------------------------------
  // 7. Insurance policies expiring in the next 60 days
  //    (or already expired, which is a red alarm)
  // ------------------------------------------------------------
  const in60 = new Date(nowMs + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const { data: expiringPolicies } = await supabase
    .from('insurance_policies')
    .select('id, carrier, policy_type, expiry_date, auto_renewal')
    .is('deleted_at', null)
    .lte('expiry_date', in60)
    .order('expiry_date', { ascending: true })

  for (const row of expiringPolicies ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const daysUntil = Math.floor(
      (new Date(r.expiry_date).getTime() - nowMs) / (1000 * 60 * 60 * 24),
    )
    const severity: EventSeverity =
      daysUntil < 0 || daysUntil <= 14 ? 'red' : 'amber'
    const title =
      daysUntil < 0
        ? `${r.carrier} ${r.policy_type} policy expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`
        : `${r.carrier} ${r.policy_type} policy expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
    const subtitle = r.auto_renewal
      ? 'Auto-renewal is on — verify with your agent that it processed.'
      : 'Reach out to your agent to renew or shop for a replacement.'
    events.push({
      id: `insurance-${r.id}`,
      severity,
      icon: '✚',
      title,
      subtitle,
      href: `/dashboard/properties/insurance/${r.id}`,
      // Expired policies get top priority within the red tier.
      sort_rank: daysUntil < 0 ? -800 + daysUntil : daysUntil,
    })
  }

  // ------------------------------------------------------------
  // 8. Rent schedules past due and not fully paid
  // ------------------------------------------------------------
  const todayIso = new Date(nowMs).toISOString().slice(0, 10)
  const { data: overdueRent } = await supabase
    .from('rent_schedules')
    .select(
      'id, due_date, amount, paid_amount, lease:leases(tenant:tenants(first_name, last_name), unit:units(unit_number, property:properties(name)))',
    )
    .is('deleted_at', null)
    .lt('due_date', todayIso)
    .in('status', ['overdue', 'partial', 'due', 'upcoming'])
    .order('due_date', { ascending: true })

  for (const row of overdueRent ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const amount = Number(r.amount)
    const paid = Number(r.paid_amount ?? 0)
    if (paid >= amount) continue
    const open = amount - paid
    const daysOverdue = Math.floor(
      (nowMs - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24),
    )
    const tenantName = r.lease?.tenant
      ? `${r.lease.tenant.first_name} ${r.lease.tenant.last_name}`
      : 'Tenant'
    const unitLabel = r.lease?.unit?.property?.name
      ? `${r.lease.unit.property.name}${r.lease.unit.unit_number ? ` · ${r.lease.unit.unit_number}` : ''}`
      : 'Unit'
    const fmtAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(open)
    events.push({
      id: `rent-overdue-${r.id}`,
      severity: 'red',
      icon: '$',
      title: `Rent overdue: ${tenantName} owes ${fmtAmount}`,
      subtitle: `${unitLabel} · ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past due`,
      href: '/dashboard/rent',
      sort_rank: -400 - daysOverdue,
    })
  }

  // ------------------------------------------------------------
  // 9. Triage inbox — unresolved inbound SMS awaiting assignment
  // ------------------------------------------------------------
  const { count: triageCount } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'triage')
    .eq('direction', 'inbound')
    .is('deleted_at', null)

  if (triageCount && triageCount > 0) {
    events.push({
      id: 'triage-inbox',
      severity: 'amber',
      icon: '✉',
      title: `${triageCount} inbound message${triageCount === 1 ? '' : 's'} awaiting triage`,
      subtitle:
        'Inbound texts from numbers not yet linked to a tenant — assign or dismiss from the Inbox.',
      href: '/dashboard/inbox',
      sort_rank: -200,
    })
  }

  // Sort: red first, then amber, then blue; within each tier,
  // lower sort_rank wins (more urgent).
  const severityOrder: Record<EventSeverity, number> = {
    red: 0,
    amber: 1,
    blue: 2,
  }
  events.sort((a, b) => {
    const s = severityOrder[a.severity] - severityOrder[b.severity]
    if (s !== 0) return s
    return a.sort_rank - b.sort_rank
  })

  return events
}
