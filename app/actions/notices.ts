'use server'

// ============================================================
// Notice server actions
// ============================================================
//
// Create, mark-served, and delete. The create action takes a
// single FormData with all the per-type fields flat on it and
// dispatches to the appropriate Zod schema based on the `type`
// field. Returns ActionState so forms can use useActionState.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  NOTICE_TYPE_VALUES,
  RentIncreaseDataSchema,
  EntryDataSchema,
  LateRentDataSchema,
  CureOrQuitDataSchema,
  TerminateTenancyDataSchema,
  MoveOutInfoDataSchema,
  NoticeMarkServedSchema,
  type NoticeType,
} from '@/app/lib/schemas/notice'
import type { ActionState } from '@/app/lib/types'

function parseDataForType(type: NoticeType, formData: FormData) {
  switch (type) {
    case 'rent_increase':
      return RentIncreaseDataSchema.safeParse({
        current_monthly_rent: formData.get('current_monthly_rent'),
        new_monthly_rent: formData.get('new_monthly_rent'),
        effective_date: formData.get('effective_date'),
        reason: formData.get('reason'),
      })
    case 'entry':
      return EntryDataSchema.safeParse({
        entry_date: formData.get('entry_date'),
        entry_time_start: formData.get('entry_time_start'),
        entry_time_end: formData.get('entry_time_end'),
        reason: formData.get('entry_reason'),
        details: formData.get('details'),
      })
    case 'late_rent':
      return LateRentDataSchema.safeParse({
        amount_due: formData.get('amount_due'),
        original_due_date: formData.get('original_due_date'),
        late_fee: formData.get('late_fee'),
        total_owed: formData.get('total_owed'),
      })
    case 'cure_or_quit':
      return CureOrQuitDataSchema.safeParse({
        amount_due: formData.get('amount_due'),
        cure_deadline_date: formData.get('cure_deadline_date'),
      })
    case 'terminate_tenancy':
      return TerminateTenancyDataSchema.safeParse({
        termination_date: formData.get('termination_date'),
        reason: formData.get('terminate_reason'),
        details: formData.get('details'),
      })
    case 'move_out_info':
      return MoveOutInfoDataSchema.safeParse({
        anticipated_move_out_date: formData.get('anticipated_move_out_date'),
        showing_notice_hours: formData.get('showing_notice_hours'),
        showings_policy: formData.get('showings_policy'),
        move_out_day_instructions: formData.get('move_out_day_instructions'),
        elevator_or_dock_booking: formData.get('elevator_or_dock_booking'),
        keys_return_instructions: formData.get('keys_return_instructions'),
        utility_transfer_note: formData.get('utility_transfer_note'),
        forwarding_address_request: formData.get('forwarding_address_request'),
      })
  }
}

export async function createNotice(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leaseId = formData.get('lease_id')
  const type = formData.get('type')
  const notes = formData.get('notes')

  if (typeof leaseId !== 'string' || !leaseId) {
    return { success: false, errors: { lease_id: ['Pick a lease.'] } }
  }
  if (typeof type !== 'string' || !NOTICE_TYPE_VALUES.includes(type as NoticeType)) {
    return { success: false, errors: { type: ['Pick a notice type.'] } }
  }

  const parsedData = parseDataForType(type as NoticeType, formData)
  if (!parsedData.success) {
    return {
      success: false,
      errors: parsedData.error.flatten().fieldErrors,
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      message: 'You must be signed in to generate a notice.',
    }
  }

  // Verify the lease belongs to this user.
  const { data: lease } = await supabase
    .from('leases')
    .select('id')
    .eq('id', leaseId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!lease) {
    return { success: false, message: 'Lease not found.' }
  }

  const { data: created, error } = await supabase
    .from('notices')
    .insert({
      owner_id: user.id,
      lease_id: leaseId,
      type,
      data: parsedData.data,
      notes: typeof notes === 'string' && notes.trim() !== '' ? notes : null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to create notice: ${error?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath('/dashboard/notices')
  revalidatePath('/dashboard')
  redirect(`/dashboard/notices/${created.id}`)
}

export async function markNoticeServed(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = NoticeMarkServedSchema.safeParse({
    served_at: formData.get('served_at'),
    served_method: formData.get('served_method'),
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
    return { success: false, message: 'You must be signed in.' }
  }

  // Store served_at with a midnight timestamp in the landlord's
  // timezone intent — we only have a date input in the UI.
  const servedAtIso = `${parsed.data.served_at}T12:00:00Z`

  const { error } = await supabase
    .from('notices')
    .update({
      served_at: servedAtIso,
      served_method: parsed.data.served_method,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to mark served: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/notices')
  revalidatePath(`/dashboard/notices/${id}`)
  return { success: true }
}

export async function deleteNotice(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('notices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to delete notice: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/notices')
  revalidatePath('/dashboard')
  redirect('/dashboard/notices')
}
