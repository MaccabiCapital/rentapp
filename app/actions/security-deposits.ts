'use server'

// ============================================================
// Security deposit settlement server actions
// ============================================================
//
// Create, update, finalize, mark-mailed, delete, plus deduction
// item CRUD. Status flow: draft → finalized → mailed.
//
// Once finalized, the itemization is "locked" for legal record;
// editing requires explicit unfinalize step. Mailed is terminal.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  SettlementCreateSchema,
  SettlementUpdateSchema,
  SettlementMarkMailedSchema,
  DeductionItemCreateSchema,
  DeductionItemUpdateSchema,
  TenantForwardingSchema,
  addDays,
} from '@/app/lib/schemas/security-deposit'
import {
  getDeductionSuggestionsForLease,
  getStateReturnDays,
} from '@/app/lib/queries/security-deposits'
import type { ActionState } from '@/app/lib/types'

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------
//
// 1. Snapshot deposit + state deadline
// 2. Copy tenant forwarding address (if set)
// 3. Insert settlement row
// 4. Insert auto-suggested damage deductions from inspection compare
// 5. Redirect to detail
export async function createSettlement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SettlementCreateSchema.safeParse({
    lease_id: formData.get('lease_id'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to create a settlement.' }
  }

  // Pull the lease + tenant + property state in one shot
  const { data: leaseRow, error: leaseErr } = await supabase
    .from('leases')
    .select(
      `id, security_deposit, end_date, owner_id,
       tenant:tenants (
         id,
         forwarding_street_address, forwarding_unit, forwarding_city,
         forwarding_state, forwarding_postal_code
       ),
       unit:units (
         property:properties ( state )
       )`,
    )
    .eq('id', parsed.data.lease_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (leaseErr) {
    return { success: false, message: leaseErr.message }
  }
  if (!leaseRow) {
    return { success: false, message: 'Lease not found.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lease = leaseRow as any
  if (lease.owner_id !== user.id) {
    return { success: false, message: 'Not your lease.' }
  }

  const originalDeposit = Number(lease.security_deposit ?? 0)
  if (!Number.isFinite(originalDeposit) || originalDeposit < 0) {
    return {
      success: false,
      message: 'Lease has no security deposit on file.',
    }
  }

  const propertyState =
    lease.unit?.property?.state ?? null
  const stateReturnDays = await getStateReturnDays(propertyState)

  const fwd = lease.tenant ?? {}

  const { data: settlement, error: insErr } = await supabase
    .from('security_deposit_settlements')
    .insert({
      owner_id: user.id,
      lease_id: parsed.data.lease_id,
      status: 'draft',
      original_deposit: originalDeposit,
      forwarding_street_address: fwd.forwarding_street_address ?? null,
      forwarding_unit: fwd.forwarding_unit ?? null,
      forwarding_city: fwd.forwarding_city ?? null,
      forwarding_state: fwd.forwarding_state ?? null,
      forwarding_postal_code: fwd.forwarding_postal_code ?? null,
      state_return_days: stateReturnDays,
      legal_deadline_date: null, // computed at finalize
    })
    .select('id')
    .single()

  if (insErr || !settlement) {
    return {
      success: false,
      message: insErr?.message ?? 'Could not create settlement.',
    }
  }

  // Auto-suggest deductions from inspection-compare
  const suggestions = await getDeductionSuggestionsForLease(
    parsed.data.lease_id,
  )

  if (suggestions.length > 0) {
    const items = suggestions.map((s, idx) => ({
      settlement_id: settlement.id,
      category: s.category,
      description: s.description,
      amount: s.amount,
      inspection_item_id: s.inspection_item_id || null,
      photos: s.photos,
      sort_order: idx,
    }))
    await supabase.from('security_deposit_deduction_items').insert(items)
  }

  revalidatePath('/dashboard/tenants/security-deposits')
  redirect(`/dashboard/tenants/security-deposits/${settlement.id}`)
}

// ------------------------------------------------------------
// Update header (forwarding address + notes)
// ------------------------------------------------------------

export async function updateSettlement(
  settlementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SettlementUpdateSchema.safeParse({
    forwarding_street_address: formData.get('forwarding_street_address'),
    forwarding_unit: formData.get('forwarding_unit'),
    forwarding_city: formData.get('forwarding_city'),
    forwarding_state: formData.get('forwarding_state'),
    forwarding_postal_code: formData.get('forwarding_postal_code'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('security_deposit_settlements')
    .update({
      forwarding_street_address: parsed.data.forwarding_street_address ?? null,
      forwarding_unit: parsed.data.forwarding_unit ?? null,
      forwarding_city: parsed.data.forwarding_city ?? null,
      forwarding_state: parsed.data.forwarding_state ?? null,
      forwarding_postal_code: parsed.data.forwarding_postal_code ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', settlementId)
    .eq('status', 'draft') // only editable while draft

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Add deduction item
// ------------------------------------------------------------

export async function addDeductionItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = DeductionItemCreateSchema.safeParse({
    settlement_id: formData.get('settlement_id'),
    category: formData.get('category'),
    description: formData.get('description'),
    amount: formData.get('amount'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()

  // Block edits if the settlement is no longer draft
  const { data: head, error: headErr } = await supabase
    .from('security_deposit_settlements')
    .select('status')
    .eq('id', parsed.data.settlement_id)
    .maybeSingle()
  if (headErr || !head) {
    return {
      success: false,
      message: headErr?.message ?? 'Settlement not found.',
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((head as any).status !== 'draft') {
    return {
      success: false,
      message: 'Unfinalize the settlement before editing deductions.',
    }
  }

  // Compute next sort_order
  const { data: lastRow } = await supabase
    .from('security_deposit_deduction_items')
    .select('sort_order')
    .eq('settlement_id', parsed.data.settlement_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextSort = ((lastRow as any)?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from('security_deposit_deduction_items')
    .insert({
      settlement_id: parsed.data.settlement_id,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      sort_order: nextSort,
    })

  if (error) return { success: false, message: error.message }

  revalidatePath(
    `/dashboard/tenants/security-deposits/${parsed.data.settlement_id}`,
  )
  return { success: true }
}

// ------------------------------------------------------------
// Update deduction item
// ------------------------------------------------------------

export async function updateDeductionItem(
  itemId: string,
  settlementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = DeductionItemUpdateSchema.safeParse({
    category: formData.get('category'),
    description: formData.get('description'),
    amount: formData.get('amount'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('security_deposit_deduction_items')
    .update({
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
    })
    .eq('id', itemId)

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Delete deduction item
// ------------------------------------------------------------

export async function deleteDeductionItem(
  itemId: string,
  settlementId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()

  // Block while non-draft
  const { data: head } = await supabase
    .from('security_deposit_settlements')
    .select('status')
    .eq('id', settlementId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((head as any)?.status !== 'draft') {
    return {
      success: false,
      message: 'Unfinalize the settlement before editing deductions.',
    }
  }

  const { error } = await supabase
    .from('security_deposit_deduction_items')
    .delete()
    .eq('id', itemId)

  if (error) return { success: false, message: error.message }
  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Finalize / unfinalize
// ------------------------------------------------------------

export async function finalizeSettlement(
  settlementId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()

  // Compute legal deadline using lease end_date + state_return_days
  const { data: row, error: readErr } = await supabase
    .from('security_deposit_settlements')
    .select(
      `id, status, state_return_days,
       lease:leases ( end_date )`,
    )
    .eq('id', settlementId)
    .maybeSingle()

  if (readErr || !row) {
    return {
      success: false,
      message: readErr?.message ?? 'Settlement not found.',
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any
  if (r.status !== 'draft') {
    return { success: false, message: 'Already finalized.' }
  }

  const endDate: string | undefined = r.lease?.end_date
  const days: number | null = r.state_return_days
  let deadline: string | null = null
  if (endDate && typeof days === 'number') {
    deadline = addDays(endDate, days)
  }

  const { error } = await supabase
    .from('security_deposit_settlements')
    .update({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
      legal_deadline_date: deadline,
    })
    .eq('id', settlementId)
    .eq('status', 'draft')

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  revalidatePath('/dashboard/tenants/security-deposits')
  return { success: true }
}

export async function unfinalizeSettlement(
  settlementId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('security_deposit_settlements')
    .update({
      status: 'draft',
      finalized_at: null,
    })
    .eq('id', settlementId)
    .eq('status', 'finalized') // can't unfinalize once mailed

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Mark mailed
// ------------------------------------------------------------

export async function markSettlementMailed(
  settlementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SettlementMarkMailedSchema.safeParse({
    mail_method: formData.get('mail_method'),
    mail_tracking_number: formData.get('mail_tracking_number'),
    mailed_on: formData.get('mailed_on'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('security_deposit_settlements')
    .update({
      status: 'mailed',
      mail_method: parsed.data.mail_method,
      mail_tracking_number: parsed.data.mail_tracking_number ?? null,
      mailed_at: new Date(parsed.data.mailed_on + 'T12:00:00Z').toISOString(),
    })
    .eq('id', settlementId)
    .in('status', ['finalized', 'mailed']) // re-record on already-mailed allowed

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/security-deposits/${settlementId}`)
  revalidatePath('/dashboard/tenants/security-deposits')
  return { success: true }
}

// ------------------------------------------------------------
// Delete settlement (soft delete)
// ------------------------------------------------------------

export async function deleteSettlement(
  settlementId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('security_deposit_settlements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', settlementId)

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/tenants/security-deposits')
  redirect('/dashboard/tenants/security-deposits')
}

// ------------------------------------------------------------
// Tenant forwarding address (lives on tenant record)
// ------------------------------------------------------------

export async function updateTenantForwarding(
  tenantId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TenantForwardingSchema.safeParse({
    forwarding_street_address: formData.get('forwarding_street_address'),
    forwarding_unit: formData.get('forwarding_unit'),
    forwarding_city: formData.get('forwarding_city'),
    forwarding_state: formData.get('forwarding_state'),
    forwarding_postal_code: formData.get('forwarding_postal_code'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      forwarding_street_address: parsed.data.forwarding_street_address ?? null,
      forwarding_unit: parsed.data.forwarding_unit ?? null,
      forwarding_city: parsed.data.forwarding_city ?? null,
      forwarding_state: parsed.data.forwarding_state ?? null,
      forwarding_postal_code: parsed.data.forwarding_postal_code ?? null,
      forwarding_captured_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
  return { success: true }
}
