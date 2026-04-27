'use server'

// ============================================================
// Lease server actions
// ============================================================
//
// Sprint 1 red-team Q3 carryover: `unit.status` gets auto-managed
// by the lease lifecycle here. One-way sync:
//
//   lease created as `active`   → unit.status := 'occupied'
//   lease transitions to `active`  → unit.status := 'occupied'
//   lease transitions to `terminated` or `expired` → unit.status := 'vacant'
//   lease transitions to `draft`   → no unit change (still marketing)
//
// Manual unit.status override still works because the unit form
// lets the landlord pick any value. This matches the red-team
// Path A: "manual source of truth with auto-sync on lease events."

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  LeaseCreateSchema,
  LeaseUpdateSchema,
  type LeaseStatus,
} from '@/app/lib/schemas/lease'
import type { ActionState } from '@/app/lib/types'
import type { UnitStatus } from '@/app/lib/schemas/unit'

function parseLeaseForm(formData: FormData) {
  return {
    tenant_id: formData.get('tenant_id'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    monthly_rent: formData.get('monthly_rent'),
    security_deposit: formData.get('security_deposit'),
    rent_due_day: formData.get('rent_due_day'),
    late_fee_amount: formData.get('late_fee_amount'),
    late_fee_grace_days: formData.get('late_fee_grace_days'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  }
}

function parseLeaseUpdateForm(formData: FormData) {
  return {
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    monthly_rent: formData.get('monthly_rent'),
    security_deposit: formData.get('security_deposit'),
    rent_due_day: formData.get('rent_due_day'),
    late_fee_amount: formData.get('late_fee_amount'),
    late_fee_grace_days: formData.get('late_fee_grace_days'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  }
}

function leaseStatusToUnitStatus(status: LeaseStatus): UnitStatus | null {
  switch (status) {
    case 'active':
      return 'occupied'
    case 'terminated':
    case 'expired':
      return 'vacant'
    case 'draft':
    case 'renewed':
      return null
  }
}

async function syncUnitStatus(
  unitId: string,
  leaseStatus: LeaseStatus,
): Promise<void> {
  const target = leaseStatusToUnitStatus(leaseStatus)
  if (target === null) return
  const supabase = await createServerClient()
  await supabase.from('units').update({ status: target }).eq('id', unitId)
}

export async function createLease(
  unitId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LeaseCreateSchema.safeParse(parseLeaseForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to create a lease.' }
  }

  // Look up the unit's property so we can redirect back correctly.
  const { data: unitRow } = await supabase
    .from('units')
    .select('property_id')
    .eq('id', unitId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!unitRow) {
    return { success: false, message: 'Unit not found.' }
  }

  const { data: lease, error } = await supabase
    .from('leases')
    .insert({
      owner_id: user.id,
      unit_id: unitId,
      tenant_id: parsed.data.tenant_id,
      status: parsed.data.status,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      monthly_rent: parsed.data.monthly_rent,
      security_deposit: parsed.data.security_deposit ?? null,
      rent_due_day: parsed.data.rent_due_day,
      late_fee_amount: parsed.data.late_fee_amount ?? null,
      late_fee_grace_days: parsed.data.late_fee_grace_days ?? null,
      notes: parsed.data.notes ?? null,
      signed_at:
        parsed.data.status === 'active' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !lease) {
    return { success: false, message: 'Failed to create lease. Please try again.' }
  }

  await syncUnitStatus(unitId, parsed.data.status)

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/properties/${unitRow.property_id}`)
  revalidatePath(`/dashboard/properties/${unitRow.property_id}/units/${unitId}`)
  revalidatePath(`/dashboard/tenants/${parsed.data.tenant_id}`)
  redirect(`/dashboard/tenants/${parsed.data.tenant_id}/leases/${lease.id}`)
}

export async function updateLease(
  leaseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LeaseUpdateSchema.safeParse(parseLeaseUpdateForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()

  // Fetch the existing lease so we know which unit to sync and
  // can compute transition-specific fields like signed_at.
  const { data: existing } = await supabase
    .from('leases')
    .select('unit_id, tenant_id, status, signed_at')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!existing) {
    return { success: false, message: 'Lease not found.' }
  }

  const nowActive =
    parsed.data.status === 'active' && existing.status !== 'active'
  const signed_at = nowActive ? new Date().toISOString() : existing.signed_at

  const { error } = await supabase
    .from('leases')
    .update({
      status: parsed.data.status,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      monthly_rent: parsed.data.monthly_rent,
      security_deposit: parsed.data.security_deposit ?? null,
      rent_due_day: parsed.data.rent_due_day,
      late_fee_amount: parsed.data.late_fee_amount ?? null,
      late_fee_grace_days: parsed.data.late_fee_grace_days ?? null,
      notes: parsed.data.notes ?? null,
      signed_at,
    })
    .eq('id', leaseId)
  if (error) {
    return { success: false, message: 'Failed to update lease. Please try again.' }
  }

  await syncUnitStatus(existing.unit_id, parsed.data.status)

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}`)
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
  redirect(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
}

// Terminate is a convenience action from the lease detail page —
// one-click transition to `terminated` with a timestamp. Doesn't
// require a form submission.
export async function terminateLease(leaseId: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('leases')
    .select('unit_id, tenant_id, status')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!existing) return { success: false, message: 'Lease not found.' }
  if (existing.status === 'terminated') {
    return { success: false, message: 'Lease is already terminated.' }
  }

  const { error } = await supabase
    .from('leases')
    .update({ status: 'terminated' })
    .eq('id', leaseId)
  if (error) {
    return { success: false, message: 'Failed to terminate lease.' }
  }

  await syncUnitStatus(existing.unit_id, 'terminated')

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}`)
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
  redirect(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
}

// Soft-delete: only works on draft leases (never delete history for
// an active/terminated lease — that's the audit trail).
export async function deleteLease(leaseId: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('leases')
    .select('tenant_id, status')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!existing) return { success: false, message: 'Lease not found.' }
  if (existing.status !== 'draft') {
    return {
      success: false,
      message:
        'Only draft leases can be deleted. Terminate an active lease instead.',
    }
  }

  const { error } = await supabase
    .from('leases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', leaseId)
  if (error) {
    return { success: false, message: 'Failed to delete lease.' }
  }

  revalidatePath(`/dashboard/tenants/${existing.tenant_id}`)
  redirect(`/dashboard/tenants/${existing.tenant_id}`)
}

// Record that a tenant gave notice on a specific date. Flips the
// unit status to 'notice_given' so the rent roll shows it clearly.
// The lease stays 'active' until the end_date — the tenant is
// still paying rent until they leave.
export async function recordTenantNotice(
  leaseId: string,
  noticeDateIso: string | null,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('leases')
    .select('unit_id, tenant_id, status')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!existing) return { success: false, message: 'Lease not found.' }

  const noticeDate = noticeDateIso ?? new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('leases')
    .update({ tenant_notice_given_on: noticeDate })
    .eq('id', leaseId)
  if (error) {
    return { success: false, message: `Failed to record notice: ${error.message}` }
  }

  // Flip unit to notice_given IF lease is still active. Skip if
  // already terminated/expired — unit would be vacant by then.
  if (existing.status === 'active') {
    await supabase
      .from('units')
      .update({ status: 'notice_given' })
      .eq('id', existing.unit_id)
  }

  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/tenants/renewals')
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}`)
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
  return { success: true }
}

// Clear the tenant-notice flag (tenant changed their mind) and
// flip the unit back to occupied.
export async function clearTenantNotice(
  leaseId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('leases')
    .select('unit_id, tenant_id, status')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!existing) return { success: false, message: 'Lease not found.' }

  const { error } = await supabase
    .from('leases')
    .update({ tenant_notice_given_on: null })
    .eq('id', leaseId)
  if (error) {
    return { success: false, message: 'Failed to clear notice.' }
  }

  if (existing.status === 'active') {
    await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', existing.unit_id)
  }

  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/tenants/renewals')
  revalidatePath(`/dashboard/tenants/${existing.tenant_id}/leases/${leaseId}`)
  return { success: true }
}

// Start a renewal offer: clone the current lease as a new draft
// with end_date bumped 12 months, and redirect to the edit page.
// If state rent-cap rules exist for the property's state, we
// surface the allowed max increase on the new lease's notes so
// the landlord sees it when editing.
export async function startRenewal(
  leaseId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Not signed in.' }

  // Fetch current lease + the property state (for rent cap lookup)
  const { data: current } = await supabase
    .from('leases')
    .select(
      'unit_id, tenant_id, monthly_rent, security_deposit, rent_due_day, late_fee_amount, late_fee_grace_days, end_date, unit:units(property:properties(state))',
    )
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!current) return { success: false, message: 'Lease not found.' }

  // Compute new dates: start = current end_date + 1 day, end = +12 months
  const currentEnd = new Date(current.end_date)
  const newStart = new Date(currentEnd)
  newStart.setUTCDate(newStart.getUTCDate() + 1)
  const newEnd = new Date(newStart)
  newEnd.setUTCFullYear(newEnd.getUTCFullYear() + 1)

  const newStartIso = newStart.toISOString().slice(0, 10)
  const newEndIso = newEnd.toISOString().slice(0, 10)

  // Look up the rent cap for the property's state, if any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = ((current as any).unit?.property?.state ?? null) as string | null
  let rentCapNote = ''
  if (state) {
    const { data: stateRules } = await supabase
      .from('state_rent_rules')
      .select('max_annual_increase_percent, max_annual_increase_formula')
      .eq('state', state)
      .maybeSingle()
    if (stateRules?.max_annual_increase_percent !== null && stateRules?.max_annual_increase_percent !== undefined) {
      rentCapNote = `[State rent cap for ${state}] Max annual increase: ${stateRules.max_annual_increase_formula ?? stateRules.max_annual_increase_percent + '%'}. Verify with your attorney.`
    }
  }

  const { data: draft, error } = await supabase
    .from('leases')
    .insert({
      owner_id: user.id,
      unit_id: current.unit_id,
      tenant_id: current.tenant_id,
      status: 'draft',
      start_date: newStartIso,
      end_date: newEndIso,
      monthly_rent: current.monthly_rent,
      security_deposit: current.security_deposit,
      rent_due_day: current.rent_due_day,
      late_fee_amount: current.late_fee_amount,
      late_fee_grace_days: current.late_fee_grace_days,
      notes: rentCapNote || null,
    })
    .select('id')
    .single()

  if (error || !draft) {
    return {
      success: false,
      message: `Failed to start renewal: ${error?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath('/dashboard/tenants/renewals')
  revalidatePath(`/dashboard/tenants/${current.tenant_id}`)
  redirect(`/dashboard/tenants/${current.tenant_id}/leases/${draft.id}/edit`)
}
