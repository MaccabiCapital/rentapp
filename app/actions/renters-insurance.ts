'use server'

// ============================================================
// Renters insurance server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  RentersInsuranceCreateSchema,
  RentersInsuranceUpdateSchema,
} from '@/app/lib/schemas/renters-insurance'
import type { ActionState } from '@/app/lib/types'

function parseForm(formData: FormData) {
  return {
    tenant_id: formData.get('tenant_id'),
    lease_id: formData.get('lease_id'),
    carrier: formData.get('carrier'),
    policy_number: formData.get('policy_number'),
    liability_coverage: formData.get('liability_coverage'),
    personal_property_coverage: formData.get('personal_property_coverage'),
    annual_premium: formData.get('annual_premium'),
    effective_date: formData.get('effective_date'),
    expiry_date: formData.get('expiry_date'),
    document_url: formData.get('document_url'),
    notes: formData.get('notes'),
  }
}

export async function createRentersInsurancePolicy(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = RentersInsuranceCreateSchema.safeParse(parseForm(formData))
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

  // Verify tenant belongs to this user
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', parsed.data.tenant_id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!tenant) {
    return { success: false, message: 'Tenant not found.' }
  }

  const { data: created, error } = await supabase
    .from('renters_insurance_policies')
    .insert({
      owner_id: user.id,
      tenant_id: parsed.data.tenant_id,
      lease_id: parsed.data.lease_id ?? null,
      carrier: parsed.data.carrier,
      policy_number: parsed.data.policy_number ?? null,
      liability_coverage: parsed.data.liability_coverage ?? null,
      personal_property_coverage:
        parsed.data.personal_property_coverage ?? null,
      annual_premium: parsed.data.annual_premium ?? null,
      effective_date: parsed.data.effective_date ?? null,
      expiry_date: parsed.data.expiry_date,
      document_url: parsed.data.document_url ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to add policy: ${error?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath('/dashboard/renters-insurance')
  revalidatePath('/dashboard')
  redirect(`/dashboard/renters-insurance/${created.id}`)
}

export async function updateRentersInsurancePolicy(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = RentersInsuranceUpdateSchema.safeParse(parseForm(formData))
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
    .from('renters_insurance_policies')
    .update({
      tenant_id: parsed.data.tenant_id,
      lease_id: parsed.data.lease_id ?? null,
      carrier: parsed.data.carrier,
      policy_number: parsed.data.policy_number ?? null,
      liability_coverage: parsed.data.liability_coverage ?? null,
      personal_property_coverage:
        parsed.data.personal_property_coverage ?? null,
      annual_premium: parsed.data.annual_premium ?? null,
      effective_date: parsed.data.effective_date ?? null,
      expiry_date: parsed.data.expiry_date,
      document_url: parsed.data.document_url ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to update policy: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/renters-insurance')
  revalidatePath(`/dashboard/renters-insurance/${id}`)
  return { success: true }
}

export async function deleteRentersInsurancePolicy(
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
    .from('renters_insurance_policies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to delete policy: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/renters-insurance')
  revalidatePath('/dashboard')
  redirect('/dashboard/renters-insurance')
}
