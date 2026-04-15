// ============================================================
// State rent rules queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { StateRentRule } from '@/app/lib/schemas/state-rules'

export async function getAllStateRules(): Promise<StateRentRule[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_rent_rules')
    .select('*')
    .order('state', { ascending: true })

  if (error) throw error
  return (data ?? []) as StateRentRule[]
}

export async function getStateRule(
  state: string,
): Promise<StateRentRule | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_rent_rules')
    .select('*')
    .eq('state', state)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as StateRentRule | null
}

// Returns the distinct set of states the current user has
// properties in. Used by the compliance dashboard to highlight
// rules relevant to the landlord.
export async function getStatesInPortfolio(): Promise<string[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('properties')
    .select('state')
    .is('deleted_at', null)

  if (error) throw error
  const set = new Set<string>()
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    if (typeof r.state === 'string' && r.state.trim() !== '') {
      set.add(r.state.trim().toUpperCase())
    }
  }
  return Array.from(set).sort()
}

// Fetch just the rules for states the landlord actually uses
export async function getPortfolioStateRules(): Promise<StateRentRule[]> {
  const states = await getStatesInPortfolio()
  if (states.length === 0) return []

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('state_rent_rules')
    .select('*')
    .in('state', states)
    .order('state', { ascending: true })

  if (error) throw error
  return (data ?? []) as StateRentRule[]
}
