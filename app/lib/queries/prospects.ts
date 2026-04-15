// ============================================================
// Prospect read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { Prospect } from '@/app/lib/schemas/prospect'
import type { Unit } from '@/app/lib/schemas/unit'
import type { Property } from '@/app/lib/schemas/property'

export type ProspectWithUnit = Prospect & {
  unit:
    | (Pick<Unit, 'id' | 'unit_number' | 'property_id'> & {
        property: Pick<Property, 'id' | 'name'>
      })
    | null
}

// Global pipeline / list query.
export async function getProspects(): Promise<ProspectWithUnit[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('prospects')
    .select(
      '*, unit:units(id, unit_number, property_id, property:properties(id, name))',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProspectWithUnit[]
}

export async function getProspect(
  id: string,
): Promise<ProspectWithUnit | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('prospects')
    .select(
      '*, unit:units(id, unit_number, property_id, property:properties(id, name))',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as ProspectWithUnit | null
}

// Count of overdue follow-ups for the dashboard badge.
export async function countOverdueFollowUps(): Promise<number> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  const { count, error } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .lt('follow_up_at', now)
    .not('follow_up_at', 'is', null)
    .in('stage', [
      'inquired',
      'application_sent',
      'application_received',
      'screening',
      'approved',
    ])
  if (error) throw error
  return count ?? 0
}
