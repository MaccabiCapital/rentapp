'use server'

// ============================================================
// Maintenance server actions
// ============================================================
//
// Delete here is a HARD delete — the maintenance_requests table
// has no deleted_at column in the current schema. This is
// intentional: landlords "close" resolved tickets via status
// transition (closed), and delete is reserved for typos /
// accidental entries. Cost history on resolved tickets is
// preserved by keeping them in the closed state, not deleted.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  MaintenanceCreateSchema,
  MaintenanceUpdateSchema,
  type MaintenanceStatus,
} from '@/app/lib/schemas/maintenance'
import type { ActionState } from '@/app/lib/types'
import { touchTeamMemberUsage } from '@/app/actions/team'

function readTeamMemberId(formData: FormData): string | null {
  const v = formData.get('team_member_id')
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}

function parseCreateForm(formData: FormData) {
  return {
    title: formData.get('title'),
    description: formData.get('description'),
    urgency: formData.get('urgency'),
    status: formData.get('status'),
    assigned_to: formData.get('assigned_to'),
    tenant_id: formData.get('tenant_id'),
    notes: formData.get('notes'),
  }
}

function parseUpdateForm(formData: FormData) {
  return {
    title: formData.get('title'),
    description: formData.get('description'),
    urgency: formData.get('urgency'),
    status: formData.get('status'),
    assigned_to: formData.get('assigned_to'),
    cost_materials: formData.get('cost_materials'),
    cost_labor: formData.get('cost_labor'),
    notes: formData.get('notes'),
  }
}

export async function createMaintenanceRequest(
  unitId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = MaintenanceCreateSchema.safeParse(parseCreateForm(formData))
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
      message: 'You must be signed in to create a maintenance request.',
    }
  }

  // Verify the unit exists and belongs to us (RLS will enforce
  // isolation, but we want the property_id for redirect anyway).
  const { data: unitRow } = await supabase
    .from('units')
    .select('property_id')
    .eq('id', unitId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!unitRow) {
    return { success: false, message: 'Unit not found.' }
  }

  const { data: created, error } = await supabase
    .from('maintenance_requests')
    .insert({
      owner_id: user.id,
      unit_id: unitId,
      tenant_id: parsed.data.tenant_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      urgency: parsed.data.urgency,
      status: parsed.data.status,
      assigned_to: parsed.data.assigned_to ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: 'Failed to create maintenance request. Please try again.',
    }
  }

  revalidatePath('/dashboard/properties/maintenance')
  revalidatePath(`/dashboard/properties/${unitRow.property_id}/units/${unitId}`)
  redirect(`/dashboard/properties/maintenance/${created.id}`)
}

export async function updateMaintenanceRequest(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = MaintenanceUpdateSchema.safeParse(parseUpdateForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()

  // Fetch the existing row so we can compute resolved_at and
  // revalidate the right unit page.
  const { data: existing } = await supabase
    .from('maintenance_requests')
    .select('unit_id, status, resolved_at')
    .eq('id', id)
    .maybeSingle()
  if (!existing) {
    return { success: false, message: 'Maintenance request not found.' }
  }

  const becomingResolved =
    parsed.data.status === 'resolved' && existing.status !== 'resolved'
  const resolved_at = becomingResolved
    ? new Date().toISOString()
    : parsed.data.status === 'open' || parsed.data.status === 'in_progress'
      ? null
      : existing.resolved_at

  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      urgency: parsed.data.urgency,
      status: parsed.data.status,
      assigned_to: parsed.data.assigned_to ?? null,
      cost_materials: parsed.data.cost_materials ?? null,
      cost_labor: parsed.data.cost_labor ?? null,
      notes: parsed.data.notes ?? null,
      resolved_at,
    })
    .eq('id', id)

  if (error) {
    return {
      success: false,
      message: 'Failed to update maintenance request. Please try again.',
    }
  }

  // If this update resolves a job AND a team member was linked,
  // bump their usage counters. This is fire-and-forget — we don't
  // fail the whole action if the counter update errors.
  if (becomingResolved) {
    const teamMemberId = readTeamMemberId(formData)
    const totalCost =
      (parsed.data.cost_materials ?? 0) + (parsed.data.cost_labor ?? 0)
    if (teamMemberId && totalCost > 0) {
      await touchTeamMemberUsage(teamMemberId, totalCost)
    }
  }

  revalidatePath('/dashboard/properties/maintenance')
  revalidatePath(`/dashboard/properties/maintenance/${id}`)
  revalidatePath(`/dashboard/settings/team`)
  revalidatePath(
    `/dashboard/properties/${existing.unit_id}`,
  )
  redirect(`/dashboard/properties/maintenance/${id}`)
}

// One-click status transition. Called from the detail page
// workflow buttons — no form, no cost prompts. Landlord uses
// Edit if they need to add costs.
export async function setMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('maintenance_requests')
    .select('unit_id, status, resolved_at')
    .eq('id', id)
    .maybeSingle()
  if (!existing) {
    return { success: false, message: 'Maintenance request not found.' }
  }

  const becomingResolved = status === 'resolved' && existing.status !== 'resolved'
  const reopening =
    (status === 'open' || status === 'in_progress') &&
    (existing.status === 'resolved' || existing.status === 'closed')

  const resolved_at = becomingResolved
    ? new Date().toISOString()
    : reopening
      ? null
      : existing.resolved_at

  const { error } = await supabase
    .from('maintenance_requests')
    .update({ status, resolved_at })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update status.' }
  }

  revalidatePath('/dashboard/properties/maintenance')
  revalidatePath(`/dashboard/properties/maintenance/${id}`)
  return { success: true }
}

// Hard delete — the schema has no deleted_at on this table.
// Use sparingly; prefer status=closed for finished tickets.
export async function deleteMaintenanceRequest(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('maintenance_requests')
    .select('unit_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('maintenance_requests')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete maintenance request.' }
  }

  revalidatePath('/dashboard/properties/maintenance')
  if (existing?.unit_id) {
    revalidatePath(`/dashboard/properties/${existing.unit_id}`)
  }
  redirect('/dashboard/properties/maintenance')
}
