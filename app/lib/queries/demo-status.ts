// ============================================================
// Demo-data detector
// ============================================================
//
// Checks whether the signed-in user currently has any demo-
// seeded properties. Used by the dashboard to switch the seed
// button between "Populate" and "Remove" modes.

import { createServerClient } from '@/lib/supabase/server'

export async function hasDemoData(): Promise<boolean> {
  const supabase = await createServerClient()
  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .ilike('notes', '[DEMO]%')
  return (count ?? 0) > 0
}
