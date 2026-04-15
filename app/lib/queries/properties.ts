// ============================================================
// Property read queries
// ============================================================
//
// Plain async helpers for Server Components. RLS auto-filters
// to the current user — no explicit owner_id check needed.

import { createServerClient } from '@/lib/supabase/server'
import type { Property } from '@/app/lib/schemas/property'

export async function getProperties(): Promise<Property[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Property[]
}

export async function getProperty(id: string): Promise<Property | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as Property | null
}
