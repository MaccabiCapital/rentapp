'use server'

// ============================================================
// Communications server actions
// ============================================================
//
// Manual log entries flow through logCommunication. The Retell
// webhook route (Sprint 13b) writes rows directly with the service
// role client and does not go through this action.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { LogCommunicationSchema } from '@/app/lib/schemas/communications'
import type { ActionState } from '@/app/lib/types'

function parseForm(formData: FormData) {
  return {
    entity_type: formData.get('entity_type'),
    entity_id: formData.get('entity_id'),
    direction: formData.get('direction'),
    channel: formData.get('channel'),
    content: formData.get('content'),
  }
}

function pickRevalidatePath(entityType: string, entityId: string) {
  switch (entityType) {
    case 'tenant':
      return `/dashboard/tenants/${entityId}`
    case 'prospect':
      return `/dashboard/prospects/${entityId}`
    case 'team_member':
      return `/dashboard/team/${entityId}`
    case 'maintenance_request':
      return `/dashboard/maintenance/${entityId}`
    case 'lease':
      return null
    case 'triage':
      return '/dashboard/inbox'
    default:
      return null
  }
}

export async function logCommunication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LogCommunicationSchema.safeParse(parseForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      message: 'You must be signed in to log communications.',
    }
  }

  const { error } = await supabase.from('communications').insert({
    owner_id: user.id,
    entity_type: parsed.data.entity_type,
    entity_id: parsed.data.entity_id,
    direction: parsed.data.direction,
    channel: parsed.data.channel,
    content: parsed.data.content,
    created_by: 'user',
  })

  if (error) {
    // RLS will throw 'new row violates row-level security policy'
    // when the pointed-to entity isn't owned by the caller. The
    // message from Postgres mentions 'row-level security' so we
    // surface a kinder error in that case.
    const isRls = /row-level security/i.test(error.message)
    return {
      success: false,
      message: isRls
        ? `That ${parsed.data.entity_type.replace('_', ' ')} could not be found.`
        : `Failed to log: ${error.message}`,
    }
  }

  const path = pickRevalidatePath(parsed.data.entity_type, parsed.data.entity_id)
  if (path) revalidatePath(path)
  return { success: true }
}

export async function softDeleteCommunication(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      message: 'You must be signed in.',
    }
  }

  // Load the row first so we know which page to revalidate.
  const { data: row } = await supabase
    .from('communications')
    .select('entity_type, entity_id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('communications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id) // defense in depth beyond RLS

  if (error) {
    return {
      success: false,
      message: `Failed to delete: ${error.message}`,
    }
  }

  if (row) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const path = pickRevalidatePath(r.entity_type, r.entity_id)
    if (path) revalidatePath(path)
  }

  return { success: true }
}

// Edit the content of a previously-logged communication. Useful
// for fixing typos or adding detail to a manually-logged entry.
// We intentionally don't let users change the entity/direction/
// channel — if those are wrong, softDelete and re-log.
export async function editCommunication(
  id: string,
  newContent: string,
): Promise<ActionState> {
  const trimmed = newContent.trim()
  if (trimmed.length === 0) {
    return {
      success: false,
      message: 'Content can\u2019t be empty.',
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // Read entity so we know which page to revalidate. Also serves
  // as an ownership check — RLS will filter the row out if it
  // belongs to someone else.
  const { data: row } = await supabase
    .from('communications')
    .select('entity_type, entity_id, metadata')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!row) {
    return { success: false, message: 'Could not find that entry.' }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any

  // Preserve existing metadata and add an edit marker.
  const existingMeta = (r.metadata ?? {}) as Record<string, unknown>
  const nextMeta = {
    ...existingMeta,
    edited_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('communications')
    .update({ content: trimmed, metadata: nextMeta })
    .eq('id', id)
    .eq('owner_id', user.id)
  if (error) {
    return { success: false, message: `Failed to edit: ${error.message}` }
  }

  const path = pickRevalidatePath(r.entity_type, r.entity_id)
  if (path) revalidatePath(path)
  return { success: true }
}
