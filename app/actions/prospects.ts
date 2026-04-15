'use server'

// ============================================================
// Prospect server actions
// ============================================================
//
// Soft-delete is in effect — the Sprint 5 migration added the
// deleted_at column. Reason: fair housing audit trail. Declined
// prospects stay queryable with stage='declined', but if a
// landlord deletes a prospect entry (typo / bad data), we keep
// the row with deleted_at set.
//
// Convert flow: when a prospect reaches `lease_signed`, a
// dedicated server action creates a tenants row via
// createTenantInline, sets converted_to_tenant_id, and redirects
// to the new-lease flow pre-filled with that tenant.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  ProspectCreateSchema,
  ProspectUpdateSchema,
  type ProspectStage,
} from '@/app/lib/schemas/prospect'
import type { ActionState } from '@/app/lib/types'
import { createTenantInline } from '@/app/actions/tenants'

function parseProspectForm(formData: FormData) {
  return {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    stage: formData.get('stage'),
    source: formData.get('source') || undefined,
    unit_id: formData.get('unit_id'),
    inquiry_message: formData.get('inquiry_message'),
    follow_up_at: formData.get('follow_up_at'),
    notes: formData.get('notes'),
  }
}

export async function createProspect(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ProspectCreateSchema.safeParse(parseProspectForm(formData))
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
      message: 'You must be signed in to add a prospect.',
    }
  }

  const { data: created, error } = await supabase
    .from('prospects')
    .insert({
      owner_id: user.id,
      unit_id: parsed.data.unit_id ?? null,
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      stage: parsed.data.stage,
      source: parsed.data.source ?? null,
      inquiry_message: parsed.data.inquiry_message ?? null,
      follow_up_at: parsed.data.follow_up_at ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { success: false, message: 'Failed to add prospect. Please try again.' }
  }

  revalidatePath('/dashboard/prospects')
  redirect(`/dashboard/prospects/${created.id}`)
}

export async function updateProspect(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ProspectUpdateSchema.safeParse(parseProspectForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('prospects')
    .update({
      unit_id: parsed.data.unit_id ?? null,
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      stage: parsed.data.stage,
      source: parsed.data.source ?? null,
      inquiry_message: parsed.data.inquiry_message ?? null,
      follow_up_at: parsed.data.follow_up_at ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update prospect. Please try again.' }
  }

  revalidatePath('/dashboard/prospects')
  revalidatePath(`/dashboard/prospects/${id}`)
  redirect(`/dashboard/prospects/${id}`)
}

// One-click stage transition from card/detail-page buttons.
export async function setProspectStage(
  id: string,
  stage: ProspectStage,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('prospects')
    .update({ stage })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update stage.' }
  }

  revalidatePath('/dashboard/prospects')
  revalidatePath(`/dashboard/prospects/${id}`)
  return { success: true }
}

// Convert a prospect to a tenant + redirect to new-lease flow.
// Requires the prospect to have a unit_id set, otherwise there's
// nothing to sign a lease for.
export async function convertProspectToTenant(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: prospect } = await supabase
    .from('prospects')
    .select(
      'id, first_name, last_name, email, phone, unit_id, converted_to_tenant_id',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!prospect) return { success: false, message: 'Prospect not found.' }
  if (!prospect.unit_id) {
    return {
      success: false,
      message: 'Link this prospect to a unit first, then convert.',
    }
  }
  if (prospect.converted_to_tenant_id) {
    // Already converted — just send them to the new-lease flow
    // for the same unit, same tenant.
    const { data: unitRow } = await supabase
      .from('units')
      .select('property_id')
      .eq('id', prospect.unit_id)
      .maybeSingle()
    if (unitRow) {
      redirect(`/dashboard/properties/${unitRow.property_id}/units/${prospect.unit_id}/lease/new`)
    }
    return { success: false, message: 'Unit not found.' }
  }

  if (!prospect.first_name || !prospect.last_name) {
    return {
      success: false,
      message:
        'Prospect needs both first and last name before converting to tenant.',
    }
  }

  const created = await createTenantInline({
    first_name: prospect.first_name,
    last_name: prospect.last_name,
    email: prospect.email ?? undefined,
    phone: prospect.phone ?? undefined,
  })

  if ('error' in created) {
    return { success: false, message: created.error }
  }

  // Link prospect → tenant and advance to lease_signed (if not already)
  await supabase
    .from('prospects')
    .update({
      converted_to_tenant_id: created.id,
      stage: 'lease_signed',
    })
    .eq('id', id)

  // Fetch unit's property so we can redirect to the new-lease page
  const { data: unitRow } = await supabase
    .from('units')
    .select('property_id')
    .eq('id', prospect.unit_id)
    .maybeSingle()

  revalidatePath('/dashboard/prospects')
  revalidatePath(`/dashboard/prospects/${id}`)
  revalidatePath('/dashboard/tenants')

  if (unitRow) {
    redirect(
      `/dashboard/properties/${unitRow.property_id}/units/${prospect.unit_id}/lease/new`,
    )
  }
  return { success: true }
}

export async function deleteProspect(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('prospects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete prospect.' }
  }

  revalidatePath('/dashboard/prospects')
  redirect('/dashboard/prospects')
}
