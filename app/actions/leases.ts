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
