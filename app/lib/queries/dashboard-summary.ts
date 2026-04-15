// ============================================================
// Dashboard home summary — lightweight counts + quick glances
// ============================================================
//
// Used by the /dashboard home page to give the landlord a
// top-level snapshot the moment they sign in. All queries are
// RLS-scoped and use head/count to avoid pulling full rows.

import { createServerClient } from '@/lib/supabase/server'

export type DashboardSummary = {
  property_count: number
  unit_count: number
  occupied_unit_count: number
  vacant_unit_count: number
  tenant_count: number
  active_lease_count: number
  open_maintenance_count: number
  active_prospect_count: number
  overdue_followup_count: number
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createServerClient()
  const nowIso = new Date().toISOString()

  // Fire the counts in parallel — each one is a head=true request
  // so only the count header comes back, not actual rows.
  const [
    props,
    unitsTotal,
    unitsOccupied,
    unitsVacant,
    tenants,
    leases,
    openMaint,
    activeProspects,
    overdueFollowups,
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'occupied'),
    supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'vacant'),
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active'),
    supabase
      .from('maintenance_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'awaiting_parts']),
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .in('stage', [
        'inquired',
        'application_sent',
        'application_received',
        'screening',
        'approved',
      ]),
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .lt('follow_up_at', nowIso)
      .not('follow_up_at', 'is', null)
      .in('stage', [
        'inquired',
        'application_sent',
        'application_received',
        'screening',
        'approved',
      ]),
  ])

  return {
    property_count: props.count ?? 0,
    unit_count: unitsTotal.count ?? 0,
    occupied_unit_count: unitsOccupied.count ?? 0,
    vacant_unit_count: unitsVacant.count ?? 0,
    tenant_count: tenants.count ?? 0,
    active_lease_count: leases.count ?? 0,
    open_maintenance_count: openMaint.count ?? 0,
    active_prospect_count: activeProspects.count ?? 0,
    overdue_followup_count: overdueFollowups.count ?? 0,
  }
}
