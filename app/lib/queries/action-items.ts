// ============================================================
// Action items — aggregates "what should I do next?" signals
// ============================================================
//
// Pulls live signals from every module and flattens them into a
// single prioritized list for the dashboard overview panel. Each
// sub-query runs in parallel; failures are swallowed so a broken
// one doesn't take down the whole panel.
//
// Severity ordering: urgent → warning → info. Within a severity
// band, items are ordered by the primary-key sort naturally
// returned by the sub-queries (typically by due/expiry date).

import { createServerClient } from '@/lib/supabase/server'

export type ActionSeverity = 'urgent' | 'warning' | 'info'

export type ActionItem = {
  id: string
  severity: ActionSeverity
  category: string
  title: string
  body: string
  href: string
  icon: string
  count?: number
}

const SEV_RANK: Record<ActionSeverity, number> = {
  urgent: 0,
  warning: 1,
  info: 2,
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

// ------------------------------------------------------------
// Individual signal queries
// ------------------------------------------------------------

async function leasesExpiringSoon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  nowMs: number,
): Promise<ActionItem[]> {
  const in60 = new Date(nowMs + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const todayIso = new Date(nowMs).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('leases')
    .select(
      `id, end_date, tenant_notice_given_on,
       tenant:tenants ( first_name, last_name ),
       unit:units ( unit_number, property:properties ( name ) )`,
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .gte('end_date', todayIso)
    .lte('end_date', in60)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  const items: ActionItem[] = []
  for (const r of rows) {
    const endMs = new Date(r.end_date).getTime()
    const daysLeft = Math.max(
      0,
      Math.floor((endMs - nowMs) / (1000 * 60 * 60 * 24)),
    )
    const severity: ActionSeverity = daysLeft <= 30 ? 'urgent' : 'warning'
    const tenantName = r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
      : 'Unknown tenant'
    const propName = r.unit?.property?.name ?? 'Unknown property'
    const unitLabel = r.unit?.unit_number ?? 'Unit'
    items.push({
      id: `lease-expiry-${r.id}`,
      severity,
      category: 'Renewals',
      title: r.tenant_notice_given_on
        ? `${tenantName} is moving out in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : `Lease with ${tenantName} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      body: `${propName} · ${unitLabel}. ${r.tenant_notice_given_on ? 'Prep move-out.' : 'Decide renewal / non-renewal and send the right notice.'}`,
      href: `/dashboard/renewals`,
      icon: '↻',
    })
  }
  return items
}

async function vacantUnitsWithoutListing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data: units } = await supabase
    .from('units')
    .select(
      `id, unit_number, property:properties ( name )`,
    )
    .eq('status', 'vacant')
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (units ?? []) as any[]
  if (rows.length === 0) return []

  const unitIds = rows.map((r) => r.id)
  const { data: listings } = await supabase
    .from('listings')
    .select('unit_id')
    .in('unit_id', unitIds)
    .eq('is_active', true)
    .is('deleted_at', null)
  const listedSet = new Set(
    ((listings ?? []) as Array<{ unit_id: string }>).map((l) => l.unit_id),
  )

  return rows
    .filter((r) => !listedSet.has(r.id))
    .map((r) => ({
      id: `vacant-no-listing-${r.id}`,
      severity: 'warning' as ActionSeverity,
      category: 'Vacancies',
      title: `${r.property?.name ?? 'Property'} · ${r.unit_number ?? 'Unit'} is vacant with no active listing`,
      body: `Create a listing to start collecting inquiries. Every vacant day is lost rent.`,
      href: `/dashboard/listings/new`,
      icon: '◎',
    }))
}

async function unfinishedInspections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('inspections')
    .select(
      `id, type, status,
       lease:leases ( tenant:tenants ( first_name, last_name ), unit:units ( unit_number, property:properties ( name ) ) )`,
    )
    .in('status', ['draft', 'in_progress'])
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []
  return rows.slice(0, 5).map((r) => {
    const tenantName = r.lease?.tenant
      ? `${r.lease.tenant.first_name} ${r.lease.tenant.last_name}`.trim()
      : 'Unknown tenant'
    const propName = r.lease?.unit?.property?.name ?? 'Unknown property'
    const unitLabel = r.lease?.unit?.unit_number ?? 'Unit'
    const typeLabel =
      r.type === 'move_in'
        ? 'Move-in'
        : r.type === 'move_out'
          ? 'Move-out'
          : 'Periodic'
    return {
      id: `inspection-open-${r.id}`,
      severity: 'info' as ActionSeverity,
      category: 'Inspections',
      title: `${typeLabel} inspection in progress — ${tenantName}`,
      body: `${propName} · ${unitLabel}. Finish rating items, collect photos, capture signatures.`,
      href: `/dashboard/inspections/${r.id}`,
      icon: '☐',
    }
  })
}

async function pendingLeasingDrafts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('leasing_messages')
    .select(
      `id, conversation_id,
       conversation:leasing_conversations ( prospect_name, prospect_id, prospect:prospects ( first_name, last_name ) )`,
    )
    .eq('direction', 'outbound_draft')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []
  // Dedupe by conversation — one "review drafts" action per convo
  const seen = new Set<string>()
  const items: ActionItem[] = []
  for (const r of rows) {
    if (seen.has(r.conversation_id)) continue
    seen.add(r.conversation_id)
    const name =
      r.conversation?.prospect_name ??
      (r.conversation?.prospect
        ? `${r.conversation.prospect.first_name ?? ''} ${r.conversation.prospect.last_name ?? ''}`.trim()
        : 'a prospect')
    items.push({
      id: `leasing-draft-${r.conversation_id}`,
      severity: 'warning',
      category: 'Leasing',
      title: `AI draft waiting for review — ${name || 'a prospect'}`,
      body: `Review the draft reply, edit if needed, and approve to send.`,
      href: `/dashboard/leasing-assistant/${r.conversation_id}`,
      icon: '✦',
    })
  }
  return items
}

async function notUnservedNotices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  nowMs: number,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('notices')
    .select(
      `id, type, generated_at,
       lease:leases ( tenant:tenants ( first_name, last_name ) )`,
    )
    .is('served_at', null)
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []
  return rows.slice(0, 5).map((r) => {
    const ageDays = Math.floor(
      (nowMs - new Date(r.generated_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    const severity: ActionSeverity = ageDays > 7 ? 'urgent' : 'warning'
    const tenantName = r.lease?.tenant
      ? `${r.lease.tenant.first_name} ${r.lease.tenant.last_name}`.trim()
      : 'tenant'
    const typeLabel =
      r.type === 'rent_increase'
        ? 'Rent increase'
        : r.type === 'entry'
          ? 'Entry'
          : r.type === 'late_rent'
            ? 'Late rent'
            : r.type === 'cure_or_quit'
              ? 'Pay or quit'
              : r.type === 'move_out_info'
                ? 'Move-out info'
                : 'Termination'
    return {
      id: `notice-unserved-${r.id}`,
      severity,
      category: 'Notices',
      title: `${typeLabel} notice for ${tenantName} not yet served (${ageDays}d old)`,
      body: `Deliver the notice (hand / mail / certified / email / posting) and record the date to keep your paper trail intact.`,
      href: `/dashboard/notices/${r.id}`,
      icon: '⚖',
    }
  })
}

async function rentersInsuranceSignals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  nowMs: number,
): Promise<ActionItem[]> {
  const items: ActionItem[] = []

  // Expired policies
  const todayIso = new Date(nowMs).toISOString().slice(0, 10)
  const { data: expired } = await supabase
    .from('renters_insurance_policies')
    .select(
      `id, expiry_date, tenant:tenants ( first_name, last_name )`,
    )
    .lt('expiry_date', todayIso)
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (expired ?? []) as any[]) {
    const tenantName = r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
      : 'tenant'
    items.push({
      id: `ri-expired-${r.id}`,
      severity: 'urgent',
      category: 'Renters insurance',
      title: `${tenantName}'s renters policy expired`,
      body: `Expired ${r.expiry_date}. Ask the tenant for updated proof of insurance and log it.`,
      href: `/dashboard/renters-insurance/${r.id}`,
      icon: '◐',
    })
  }

  // Expiring within 30 days
  const in30Iso = new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const { data: expiring } = await supabase
    .from('renters_insurance_policies')
    .select(
      `id, expiry_date, tenant:tenants ( first_name, last_name )`,
    )
    .gte('expiry_date', todayIso)
    .lte('expiry_date', in30Iso)
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (expiring ?? []) as any[]) {
    const tenantName = r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
      : 'tenant'
    items.push({
      id: `ri-expiring-${r.id}`,
      severity: 'warning',
      category: 'Renters insurance',
      title: `${tenantName}'s renters policy expires soon`,
      body: `Expires ${r.expiry_date}. Give the tenant a heads-up to renew.`,
      href: `/dashboard/renters-insurance/${r.id}`,
      icon: '◐',
    })
  }

  // Active leases requiring renters insurance but tenant has no current policy
  const { data: leasesReq } = await supabase
    .from('leases')
    .select(
      `id, tenant_id, end_date, tenant:tenants ( first_name, last_name ), unit:units ( unit_number, property:properties ( name ) )`,
    )
    .eq('status', 'active')
    .eq('requires_renters_insurance', true)
    .is('deleted_at', null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leases = (leasesReq ?? []) as any[]
  if (leases.length === 0) return items

  const { data: policies } = await supabase
    .from('renters_insurance_policies')
    .select('tenant_id, expiry_date')
    .gte('expiry_date', todayIso)
    .is('deleted_at', null)
  const covered = new Set(
    ((policies ?? []) as Array<{ tenant_id: string }>).map((p) => p.tenant_id),
  )
  for (const l of leases) {
    if (covered.has(l.tenant_id)) continue
    const tenantName = l.tenant
      ? `${l.tenant.first_name} ${l.tenant.last_name}`.trim()
      : 'tenant'
    const propName = l.unit?.property?.name ?? 'Property'
    const unitLabel = l.unit?.unit_number ?? 'Unit'
    items.push({
      id: `ri-missing-${l.id}`,
      severity: 'urgent',
      category: 'Renters insurance',
      title: `${tenantName} is missing a required renters policy`,
      body: `Lease at ${propName} · ${unitLabel} requires renters insurance. Request proof and log it.`,
      href: `/dashboard/renters-insurance/new`,
      icon: '◐',
    })
  }
  return items
}

async function prospectFollowups(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  nowMs: number,
): Promise<ActionItem[]> {
  const nowIso = new Date(nowMs).toISOString()
  const { data } = await supabase
    .from('prospects')
    .select('id, first_name, last_name, follow_up_at, stage')
    .lt('follow_up_at', nowIso)
    .is('deleted_at', null)
    .in('stage', [
      'inquired',
      'application_sent',
      'application_received',
      'screening',
    ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []
  return rows.slice(0, 5).map((r) => {
    const daysOverdue = Math.floor(
      (nowMs - new Date(r.follow_up_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    const name =
      `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'A prospect'
    return {
      id: `prospect-followup-${r.id}`,
      severity: (daysOverdue > 7 ? 'urgent' : 'warning') as ActionSeverity,
      category: 'Prospects',
      title: `${name} follow-up is ${daysOverdue}d overdue`,
      body: `Get back to them or move them down the pipeline before the lead goes cold.`,
      href: `/dashboard/prospects/${r.id}`,
      icon: '→',
    }
  })
}

async function pendingLateFees(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('late_fee_charges')
    .select(
      `id, amount, applied_on,
       lease:leases (
         tenant:tenants ( first_name, last_name ),
         unit:units ( unit_number, property:properties ( name ) )
       )`,
    )
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('applied_on', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalAmount)

  // One aggregated item rather than one per fee — keeps the panel
  // readable when there are many.
  return [
    {
      id: 'late-fees-pending',
      severity: 'warning',
      category: 'Late fees',
      title: `${rows.length} late fee${rows.length === 1 ? '' : 's'} owed (${formatted})`,
      body: 'Auto-applied to overdue rent. Review, mark paid as collected, or waive.',
      href: '/dashboard/late-fees',
      icon: '⏱',
      count: rows.length,
    },
  ]
}

async function screeningReviewsWaiting(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('screening_reports')
    .select(
      `id, prospect_id, risk_band,
       prospect:prospects ( first_name, last_name )`,
    )
    .in('status', ['complete', 'partial'])
    .in('risk_band', ['amber', 'red'])
    .is('landlord_decision', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []

  const reds = rows.filter((r) => r.risk_band === 'red').length
  const ambers = rows.filter((r) => r.risk_band === 'amber').length
  const severity: ActionSeverity = reds > 0 ? 'urgent' : 'warning'

  // Single aggregated tile rather than one per prospect. The first
  // prospect's URL is the link; counts go in the title.
  const firstProspectId = rows[0].prospect_id

  const titleParts: string[] = []
  if (reds > 0) titleParts.push(`${reds} red`)
  if (ambers > 0) titleParts.push(`${ambers} amber`)

  return [
    {
      id: 'screening-reviews-waiting',
      severity,
      category: 'Screening',
      title: `${rows.length} screening review${rows.length === 1 ? '' : 's'} waiting (${titleParts.join(', ')})`,
      body: 'Proof Check ran and raised review-prompts on these applications. Open each to view findings, then approve, request more info, or reject.',
      href: `/dashboard/prospects/${firstProspectId}/screening`,
      icon: '⌖',
      count: rows.length,
    },
  ]
}

async function urgentMaintenance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from('maintenance_requests')
    .select(
      `id, title, urgency, status, created_at,
       unit:units ( unit_number, property:properties ( name ) )`,
    )
    .in('status', ['open', 'assigned', 'in_progress', 'awaiting_parts'])
    .in('urgency', ['emergency', 'high'])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []
  return rows.slice(0, 5).map((r) => {
    const propName = r.unit?.property?.name ?? 'Property'
    const unitLabel = r.unit?.unit_number ?? 'Unit'
    const isEmergency = r.urgency === 'emergency'
    return {
      id: `maint-urgent-${r.id}`,
      severity: (isEmergency ? 'urgent' : 'warning') as ActionSeverity,
      category: 'Maintenance',
      title: `${isEmergency ? 'Emergency' : 'High-priority'} maintenance — ${r.title}`,
      body: `${propName} · ${unitLabel}. Assign, status-update, or close.`,
      href: `/dashboard/maintenance/${r.id}`,
      icon: '⚙',
    }
  })
}

async function recurringMaintenanceDue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ActionItem[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('recurring_maintenance_tasks')
    .select(
      `id, title, next_due_date, lead_time_days,
       property:properties ( name ),
       unit:units ( unit_number, property:properties ( name ) )`,
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .lte('next_due_date', today) // overdue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overdueRows = (data ?? []) as any[]

  // Also pull active tasks within their lead-time window
  const { data: dataSoon } = await supabase
    .from('recurring_maintenance_tasks')
    .select(
      `id, title, next_due_date, lead_time_days,
       property:properties ( name ),
       unit:units ( unit_number, property:properties ( name ) )`,
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .gt('next_due_date', today)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soonRows = ((dataSoon ?? []) as any[]).filter((r) => {
    const days = Math.floor(
      (new Date(r.next_due_date + 'T00:00:00Z').getTime() -
        new Date(today + 'T00:00:00Z').getTime()) /
        (1000 * 60 * 60 * 24),
    )
    return days <= r.lead_time_days
  })

  const items: ActionItem[] = []
  // Overdue ones get individual entries (they need attention)
  for (const r of overdueRows.slice(0, 5)) {
    const where = r.property?.name
      ? r.property.name
      : r.unit
        ? `${r.unit.property?.name ?? 'Property'} · ${r.unit.unit_number ?? 'Unit'}`
        : ''
    items.push({
      id: `recur-overdue-${r.id}`,
      severity: 'urgent',
      category: 'Recurring maintenance',
      title: `Overdue: ${r.title}`,
      body: `${where} — was due ${r.next_due_date}. Mark complete or reschedule.`,
      href: `/dashboard/maintenance/recurring/${r.id}`,
      icon: '⏱',
    })
  }
  // Coming-up ones: aggregate into a single tile
  if (soonRows.length > 0) {
    items.push({
      id: 'recur-soon',
      severity: 'warning',
      category: 'Recurring maintenance',
      title: `${soonRows.length} recurring task${soonRows.length === 1 ? '' : 's'} due soon`,
      body: 'Within the lead-time window. Schedule the vendor before they go overdue.',
      href: '/dashboard/maintenance/recurring',
      icon: '⏱',
      count: soonRows.length,
    })
  }
  return items
}

// ------------------------------------------------------------
// Public entrypoint
// ------------------------------------------------------------

export async function getActionItems(): Promise<ActionItem[]> {
  const supabase = await createServerClient()
  const nowMs = Date.now()

  const [
    expiring,
    vacant,
    inspections,
    drafts,
    unserved,
    renters,
    prospects,
    maint,
    lateFees,
    screening,
    recurMaint,
  ] = await Promise.all([
    safe(() => leasesExpiringSoon(supabase, nowMs), []),
    safe(() => vacantUnitsWithoutListing(supabase), []),
    safe(() => unfinishedInspections(supabase), []),
    safe(() => pendingLeasingDrafts(supabase), []),
    safe(() => notUnservedNotices(supabase, nowMs), []),
    safe(() => rentersInsuranceSignals(supabase, nowMs), []),
    safe(() => prospectFollowups(supabase, nowMs), []),
    safe(() => urgentMaintenance(supabase), []),
    safe(() => pendingLateFees(supabase), []),
    safe(() => screeningReviewsWaiting(supabase), []),
    safe(() => recurringMaintenanceDue(supabase), []),
  ])

  const all: ActionItem[] = [
    ...expiring,
    ...vacant,
    ...inspections,
    ...drafts,
    ...unserved,
    ...renters,
    ...prospects,
    ...maint,
    ...lateFees,
    ...screening,
    ...recurMaint,
  ]

  return all.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
}

export async function getActionItemSummary(): Promise<{
  urgent: number
  warning: number
  info: number
  total: number
}> {
  const items = await getActionItems()
  let urgent = 0
  let warning = 0
  let info = 0
  for (const it of items) {
    if (it.severity === 'urgent') urgent += 1
    else if (it.severity === 'warning') warning += 1
    else info += 1
  }
  return { urgent, warning, info, total: items.length }
}
