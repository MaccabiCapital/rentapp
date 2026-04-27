'use server'

// ============================================================
// Inspection server actions
// ============================================================
//
// Covers header CRUD + item CRUD + signature capture.
//
// Status progression:
//   draft       — created, no items rated
//   in_progress — at least one item rated (auto-set on first rate)
//   completed   — landlord pressed "mark complete"
//   signed      — tenant has also signed off
//
// We recompute rated counts in updateInspectionItem so the
// status column stays in sync without the caller thinking about it.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  InspectionCreateSchema,
  InspectionUpdateSchema,
  ItemCreateSchema,
  ItemUpdateSchema,
  SignSchema,
} from '@/app/lib/schemas/inspection'
import { STARTER_CHECKLIST } from '@/app/lib/inspection-templates'
import type { ActionState } from '@/app/lib/types'

function parseCreateForm(formData: FormData) {
  return {
    lease_id: formData.get('lease_id'),
    type: formData.get('type'),
    scheduled_for: formData.get('scheduled_for'),
    notes: formData.get('notes'),
  }
}

function parseUpdateForm(formData: FormData) {
  return {
    type: formData.get('type'),
    scheduled_for: formData.get('scheduled_for'),
    notes: formData.get('notes'),
  }
}

function parseItemUpdateForm(formData: FormData) {
  return {
    room: formData.get('room'),
    item: formData.get('item'),
    condition: formData.get('condition'),
    notes: formData.get('notes'),
  }
}

async function recomputeStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  inspectionId: string,
) {
  const { data: header } = await supabase
    .from('inspections')
    .select('status')
    .eq('id', inspectionId)
    .maybeSingle()
  if (!header) return
  // Don't touch already-completed or signed inspections here.
  // Only auto-flip draft → in_progress when the first rating lands.
  if (header.status !== 'draft') return

  const { count } = await supabase
    .from('inspection_items')
    .select('id', { count: 'exact', head: true })
    .eq('inspection_id', inspectionId)
    .not('condition', 'is', null)

  if ((count ?? 0) > 0) {
    await supabase
      .from('inspections')
      .update({ status: 'in_progress' })
      .eq('id', inspectionId)
  }
}

// ------------------------------------------------------------
// Create — seeds the starter checklist
// ------------------------------------------------------------

export async function createInspection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InspectionCreateSchema.safeParse(parseCreateForm(formData))
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
      message: 'You must be signed in to start an inspection.',
    }
  }

  // Verify the lease belongs to this user — RLS will block an
  // INSERT referencing someone else's lease, but a clean error
  // message is friendlier than a Postgres FK violation.
  const { data: lease } = await supabase
    .from('leases')
    .select('id')
    .eq('id', parsed.data.lease_id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!lease) {
    return {
      success: false,
      message: 'That lease could not be found.',
    }
  }

  const { data: created, error } = await supabase
    .from('inspections')
    .insert({
      owner_id: user.id,
      lease_id: parsed.data.lease_id,
      type: parsed.data.type,
      scheduled_for: parsed.data.scheduled_for ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to create inspection: ${error?.message ?? 'unknown error'}`,
    }
  }

  // Seed the starter checklist. If this fails, the inspection is
  // still usable — the landlord can add items manually. We don't
  // roll back.
  const seedRows = STARTER_CHECKLIST.map((s, idx) => ({
    inspection_id: created.id,
    room: s.room,
    item: s.item,
    sort_order: idx,
  }))
  const { error: seedErr } = await supabase
    .from('inspection_items')
    .insert(seedRows)
  if (seedErr) {
    console.error('Starter checklist seed failed:', seedErr.message)
  }

  revalidatePath('/dashboard/properties/inspections')
  revalidatePath('/dashboard')
  redirect(`/dashboard/properties/inspections/${created.id}`)
}

// ------------------------------------------------------------
// Update header
// ------------------------------------------------------------

export async function updateInspection(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InspectionUpdateSchema.safeParse(parseUpdateForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('inspections')
    .update({
      type: parsed.data.type,
      scheduled_for: parsed.data.scheduled_for ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to update inspection: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/properties/inspections')
  revalidatePath(`/dashboard/properties/inspections/${id}`)
  return { success: true }
}

// ------------------------------------------------------------
// Delete (soft)
// ------------------------------------------------------------

export async function deleteInspection(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('inspections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to delete inspection: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/properties/inspections')
  revalidatePath('/dashboard')
  redirect('/dashboard/properties/inspections')
}

// ------------------------------------------------------------
// Item: add
// ------------------------------------------------------------

export async function addInspectionItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = {
    inspection_id: formData.get('inspection_id'),
    room: formData.get('room'),
    item: formData.get('item'),
    sort_order: formData.get('sort_order'),
  }
  const parsed = ItemCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // Verify the parent inspection belongs to this user.
  const { data: parent } = await supabase
    .from('inspections')
    .select('id')
    .eq('id', parsed.data.inspection_id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!parent) {
    return { success: false, message: 'Inspection not found.' }
  }

  const { error } = await supabase.from('inspection_items').insert({
    inspection_id: parsed.data.inspection_id,
    room: parsed.data.room,
    item: parsed.data.item,
    sort_order: parsed.data.sort_order,
  })

  if (error) {
    return {
      success: false,
      message: `Failed to add item: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/properties/inspections/${parsed.data.inspection_id}`)
  return { success: true }
}

// ------------------------------------------------------------
// Item: update (condition + notes + room/item rename)
// ------------------------------------------------------------

export async function updateInspectionItem(
  itemId: string,
  inspectionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ItemUpdateSchema.safeParse(parseItemUpdateForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // Defense in depth — verify parent ownership before updating item.
  const { data: parent } = await supabase
    .from('inspections')
    .select('id, owner_id')
    .eq('id', inspectionId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!parent) {
    return { success: false, message: 'Inspection not found.' }
  }

  const { error } = await supabase
    .from('inspection_items')
    .update({
      room: parsed.data.room,
      item: parsed.data.item,
      condition: parsed.data.condition ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', itemId)
    .eq('inspection_id', inspectionId)

  if (error) {
    return {
      success: false,
      message: `Failed to update item: ${error.message}`,
    }
  }

  await recomputeStatus(supabase, inspectionId)

  revalidatePath(`/dashboard/properties/inspections/${inspectionId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Item: delete
// ------------------------------------------------------------

export async function deleteInspectionItem(
  itemId: string,
  inspectionId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { data: parent } = await supabase
    .from('inspections')
    .select('id')
    .eq('id', inspectionId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!parent) {
    return { success: false, message: 'Inspection not found.' }
  }

  const { error } = await supabase
    .from('inspection_items')
    .delete()
    .eq('id', itemId)
    .eq('inspection_id', inspectionId)

  if (error) {
    return {
      success: false,
      message: `Failed to delete item: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/properties/inspections/${inspectionId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Mark complete (landlord has finished rating)
// ------------------------------------------------------------

export async function markInspectionComplete(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('inspections')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to mark complete: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/properties/inspections/${id}`)
  revalidatePath('/dashboard/properties/inspections')
  return { success: true }
}

// ------------------------------------------------------------
// Re-open (walk back from completed to in_progress)
// ------------------------------------------------------------

export async function reopenInspection(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('inspections')
    .update({ status: 'in_progress', completed_at: null })
    .eq('id', id)
    .eq('owner_id', user.id)
    .in('status', ['completed', 'signed'])

  if (error) {
    return {
      success: false,
      message: `Failed to re-open inspection: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/properties/inspections/${id}`)
  revalidatePath('/dashboard/properties/inspections')
  return { success: true }
}

// ------------------------------------------------------------
// Sign — tenant or landlord. Typed-name signatures for v1.
// Once BOTH parties have signed, status flips to 'signed'.
// ------------------------------------------------------------

export async function signInspection(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SignSchema.safeParse({
    party: formData.get('party'),
    name: formData.get('name'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { data: current } = await supabase
    .from('inspections')
    .select('tenant_signed_at, landlord_signed_at, status')
    .eq('id', id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!current) {
    return { success: false, message: 'Inspection not found.' }
  }

  const nowIso = new Date().toISOString()
  const patch: Record<string, string | null> = {}
  if (parsed.data.party === 'tenant') {
    patch.tenant_signed_at = nowIso
    patch.tenant_signature_name = parsed.data.name
  } else {
    patch.landlord_signed_at = nowIso
    patch.landlord_signature_name = parsed.data.name
  }

  // If the OTHER party has already signed, we're fully signed.
  const otherSigned =
    parsed.data.party === 'tenant'
      ? !!current.landlord_signed_at
      : !!current.tenant_signed_at
  if (otherSigned) {
    patch.status = 'signed'
  }

  const { error } = await supabase
    .from('inspections')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to record signature: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/properties/inspections/${id}`)
  revalidatePath('/dashboard/properties/inspections')
  return { success: true }
}
