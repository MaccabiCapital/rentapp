'use server'

// ============================================================
// Tenant server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  TenantCreateSchema,
  TenantUpdateSchema,
} from '@/app/lib/schemas/tenant'
import type { ActionState } from '@/app/lib/types'

function parseTenantForm(formData: FormData) {
  return {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    date_of_birth: formData.get('date_of_birth'),
    emergency_contact_name: formData.get('emergency_contact_name'),
    emergency_contact_phone: formData.get('emergency_contact_phone'),
    notes: formData.get('notes'),
  }
}

export async function createTenant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TenantCreateSchema.safeParse(parseTenantForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to add a tenant.' }
  }

  const { error } = await supabase.from('tenants').insert({
    owner_id: user.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    date_of_birth: parsed.data.date_of_birth ?? null,
    emergency_contact_name: parsed.data.emergency_contact_name ?? null,
    emergency_contact_phone: parsed.data.emergency_contact_phone ?? null,
    notes: parsed.data.notes ?? null,
  })
  if (error) {
    return { success: false, message: 'Failed to add tenant. Please try again.' }
  }

  revalidatePath('/dashboard/tenants')
  redirect('/dashboard/tenants')
}

export async function updateTenant(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TenantUpdateSchema.safeParse(parseTenantForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      date_of_birth: parsed.data.date_of_birth ?? null,
      emergency_contact_name: parsed.data.emergency_contact_name ?? null,
      emergency_contact_phone: parsed.data.emergency_contact_phone ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)
  if (error) {
    return { success: false, message: 'Failed to update tenant. Please try again.' }
  }

  revalidatePath('/dashboard/tenants')
  revalidatePath(`/dashboard/tenants/${id}`)
  redirect(`/dashboard/tenants/${id}`)
}

// NOTE: Like deleteProperty, we guard against deleting a tenant
// with an active or draft lease. Landlords who want to clean up
// their roster should terminate leases first.
export async function deleteTenant(id: string): Promise<ActionState> {
  const supabase = await createServerClient()

  const { count } = await supabase
    .from('leases')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', id)
    .is('deleted_at', null)
    .in('status', ['active', 'draft'])

  if (count && count > 0) {
    return {
      success: false,
      message: 'Terminate all active leases before deleting this tenant.',
    }
  }

  const { error } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    return { success: false, message: 'Failed to delete tenant. Please try again.' }
  }

  revalidatePath('/dashboard/tenants')
  redirect('/dashboard/tenants')
}

// Create helper used inline from the lease creation flow. Returns
// the new tenant id so the caller can link a lease to it without
// an extra round-trip. Does NOT redirect; the caller handles flow.
export async function createTenantInline(input: {
  first_name: string
  last_name: string
  email?: string
  phone?: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      owner_id: user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to create tenant.' }
  revalidatePath('/dashboard/tenants')
  return { id: data.id }
}
