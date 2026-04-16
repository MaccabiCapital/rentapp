'use server'

// ============================================================
// Insurance policy server actions
// ============================================================
//
// Create/update/delete for insurance_policies + the policy_properties
// junction. Properties come in as a multi-select — the action replaces
// the junction set on every update (delete + re-insert inside a single
// logical write, at best-effort semantics; PostgREST doesn't give us a
// real transaction here).

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  InsuranceCreateSchema,
  InsuranceUpdateSchema,
} from '@/app/lib/schemas/insurance'
import type { ActionState } from '@/app/lib/types'

function parseInsuranceForm(formData: FormData) {
  return {
    carrier: formData.get('carrier'),
    policy_number: formData.get('policy_number'),
    policy_type: formData.get('policy_type'),
    coverage_amount: formData.get('coverage_amount'),
    liability_limit: formData.get('liability_limit'),
    annual_premium: formData.get('annual_premium'),
    deductible: formData.get('deductible'),
    effective_date: formData.get('effective_date'),
    expiry_date: formData.get('expiry_date'),
    renewal_date: formData.get('renewal_date'),
    auto_renewal: formData.get('auto_renewal'),
    team_member_id: formData.get('team_member_id'),
    notes: formData.get('notes'),
    document_url: formData.get('document_url'),
    property_ids: formData.getAll('property_ids'),
  }
}

async function syncPolicyProperties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  policyId: string,
  propertyIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Replace the junction rows. delete-all-then-insert is fine because
  // we're behind RLS and the PK is (policy_id, property_id).
  const { error: delErr } = await supabase
    .from('policy_properties')
    .delete()
    .eq('policy_id', policyId)
  if (delErr) return { ok: false, message: delErr.message }

  if (propertyIds.length === 0) return { ok: true }

  const rows = propertyIds.map((pid) => ({
    policy_id: policyId,
    property_id: pid,
  }))
  const { error: insErr } = await supabase
    .from('policy_properties')
    .insert(rows)
  if (insErr) return { ok: false, message: insErr.message }
  return { ok: true }
}

export async function createInsurancePolicy(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InsuranceCreateSchema.safeParse(parseInsuranceForm(formData))
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
      message: 'You must be signed in to add an insurance policy.',
    }
  }

  const { data: created, error } = await supabase
    .from('insurance_policies')
    .insert({
      owner_id: user.id,
      team_member_id: parsed.data.team_member_id ?? null,
      carrier: parsed.data.carrier,
      policy_number: parsed.data.policy_number ?? null,
      policy_type: parsed.data.policy_type,
      coverage_amount: parsed.data.coverage_amount ?? null,
      liability_limit: parsed.data.liability_limit ?? null,
      annual_premium: parsed.data.annual_premium ?? null,
      deductible: parsed.data.deductible ?? null,
      effective_date: parsed.data.effective_date ?? null,
      expiry_date: parsed.data.expiry_date,
      renewal_date: parsed.data.renewal_date ?? null,
      auto_renewal: parsed.data.auto_renewal,
      notes: parsed.data.notes ?? null,
      document_url: parsed.data.document_url ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to add insurance policy: ${error?.message ?? 'unknown error'}`,
    }
  }

  const sync = await syncPolicyProperties(
    supabase,
    created.id,
    parsed.data.property_ids,
  )
  if (!sync.ok) {
    return {
      success: false,
      message: `Policy saved but properties could not be linked: ${sync.message}`,
    }
  }

  revalidatePath('/dashboard/insurance')
  revalidatePath('/dashboard')
  redirect(`/dashboard/insurance/${created.id}`)
}

export async function updateInsurancePolicy(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InsuranceUpdateSchema.safeParse(parseInsuranceForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('insurance_policies')
    .update({
      team_member_id: parsed.data.team_member_id ?? null,
      carrier: parsed.data.carrier,
      policy_number: parsed.data.policy_number ?? null,
      policy_type: parsed.data.policy_type,
      coverage_amount: parsed.data.coverage_amount ?? null,
      liability_limit: parsed.data.liability_limit ?? null,
      annual_premium: parsed.data.annual_premium ?? null,
      deductible: parsed.data.deductible ?? null,
      effective_date: parsed.data.effective_date ?? null,
      expiry_date: parsed.data.expiry_date,
      renewal_date: parsed.data.renewal_date ?? null,
      auto_renewal: parsed.data.auto_renewal,
      notes: parsed.data.notes ?? null,
      document_url: parsed.data.document_url ?? null,
    })
    .eq('id', id)

  if (error) {
    return {
      success: false,
      message: `Failed to update insurance policy: ${error.message}`,
    }
  }

  const sync = await syncPolicyProperties(
    supabase,
    id,
    parsed.data.property_ids,
  )
  if (!sync.ok) {
    return {
      success: false,
      message: `Policy updated but property links could not be saved: ${sync.message}`,
    }
  }

  revalidatePath('/dashboard/insurance')
  revalidatePath(`/dashboard/insurance/${id}`)
  revalidatePath('/dashboard')
  redirect(`/dashboard/insurance/${id}`)
}

export async function deleteInsurancePolicy(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('insurance_policies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete insurance policy.' }
  }

  revalidatePath('/dashboard/insurance')
  revalidatePath('/dashboard')
  redirect('/dashboard/insurance')
}
