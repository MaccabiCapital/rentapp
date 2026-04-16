// ============================================================
// Communications read queries
// ============================================================
//
// Timeline queries are the hot path — (entity_type, entity_id,
// created_at DESC) is indexed in db/schema.sql. Triage queries
// look up rows where entity_type='triage' and entity_id=owner_id
// (our convention for unresolved inbound messages).

import { createServerClient } from '@/lib/supabase/server'
import type {
  Communication,
  CommEntityType,
} from '@/app/lib/schemas/communications'

export async function getCommunicationsForEntity(
  entityType: CommEntityType,
  entityId: string,
  limit = 100,
): Promise<Communication[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Communication[]
}

// Triage rows are inbound messages the Retell webhook couldn't
// resolve to a tenant. Convention: entity_type='triage',
// entity_id = owner_id. RLS already scopes to the caller.
export async function getTriageQueue(
  limit = 50,
): Promise<Communication[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .eq('entity_type', 'triage')
    .eq('direction', 'inbound')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Communication[]
}

export async function getTriageCount(): Promise<number> {
  const supabase = await createServerClient()
  const { count, error } = await supabase
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'triage')
    .eq('direction', 'inbound')
    .is('deleted_at', null)

  if (error) throw error
  return count ?? 0
}
