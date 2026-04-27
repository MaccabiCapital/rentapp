'use server'

// ============================================================
// Late fee server actions
// ============================================================
//
// Manual apply, waive, mark-paid, run-scan-now, lease config
// update. The auto-scan engine itself lives in
// app/lib/late-fees/scanner.ts so it can be called from both the
// cron route and these actions.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  ApplyLateFeeSchema,
  WaiveLateFeeSchema,
  MarkLateFeePaidSchema,
  LeaseLateFeeConfigSchema,
} from '@/app/lib/schemas/late-fee'
import { scanAndApplyLateFees } from '@/app/lib/late-fees/scanner'
import type { ActionState } from '@/app/lib/types'

// ------------------------------------------------------------
// Manually apply a late fee on a rent schedule
// ------------------------------------------------------------

export async function applyLateFeeManually(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ApplyLateFeeSchema.safeParse({
    rent_schedule_id: formData.get('rent_schedule_id'),
    amount: formData.get('amount'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to apply a late fee.' }
  }

  // Look up the rent_schedule to copy lease_id and verify ownership
  const { data: sched, error: sErr } = await supabase
    .from('rent_schedules')
    .select('id, lease_id, owner_id')
    .eq('id', parsed.data.rent_schedule_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (sErr || !sched) {
    return {
      success: false,
      message: sErr?.message ?? 'Rent line not found.',
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((sched as any).owner_id !== user.id) {
    return { success: false, message: 'Not your rent line.' }
  }

  const { error } = await supabase.from('late_fee_charges').insert({
    owner_id: user.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lease_id: (sched as any).lease_id,
    rent_schedule_id: parsed.data.rent_schedule_id,
    amount: parsed.data.amount,
    source: 'manual',
    notes: parsed.data.notes ?? null,
  })

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/rent/late-fees')
  revalidatePath('/dashboard/rent')
  return { success: true }
}

// ------------------------------------------------------------
// Waive
// ------------------------------------------------------------

export async function waiveLateFee(
  chargeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = WaiveLateFeeSchema.safeParse({
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('late_fee_charges')
    .update({
      status: 'waived',
      waived_at: new Date().toISOString(),
      waived_reason: parsed.data.reason,
    })
    .eq('id', chargeId)
    .eq('status', 'pending') // can't waive paid

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/rent/late-fees')
  return { success: true }
}

// ------------------------------------------------------------
// Mark paid
// ------------------------------------------------------------

export async function markLateFeePaid(
  chargeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = MarkLateFeePaidSchema.safeParse({
    paid_on: formData.get('paid_on'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('late_fee_charges')
    .update({
      status: 'paid',
      paid_at: new Date(parsed.data.paid_on + 'T12:00:00Z').toISOString(),
    })
    .eq('id', chargeId)
    .eq('status', 'pending')

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/rent/late-fees')
  return { success: true }
}

// ------------------------------------------------------------
// Delete (soft) — for manual fees applied in error
// ------------------------------------------------------------

export async function deleteLateFee(chargeId: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('late_fee_charges')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', chargeId)

  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/rent/late-fees')
  return { success: true }
}

// ------------------------------------------------------------
// Update lease late fee config
// ------------------------------------------------------------

export async function updateLeaseLateFeeConfig(
  leaseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LeaseLateFeeConfigSchema.safeParse({
    late_fee_amount: formData.get('late_fee_amount'),
    late_fee_grace_days: formData.get('late_fee_grace_days'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('leases')
    .update({
      late_fee_amount: parsed.data.late_fee_amount,
      late_fee_grace_days: parsed.data.late_fee_grace_days,
    })
    .eq('id', leaseId)

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/rent/late-fees`)
  revalidatePath(`/dashboard/rent`)
  return { success: true }
}

// ------------------------------------------------------------
// Run scan now (manual trigger from the dashboard)
// ------------------------------------------------------------

export async function runLateFeeScanNow(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to run the scan.' }
  }

  try {
    await scanAndApplyLateFees({ ownerId: user.id })
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Scan failed.',
    }
  }

  revalidatePath('/dashboard/rent/late-fees')
  revalidatePath('/dashboard/rent')
  revalidatePath('/dashboard')
  return { success: true }
}
