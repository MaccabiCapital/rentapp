'use server'

// ============================================================
// Recurring maintenance server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  TaskUpsertSchema,
  CompleteTaskSchema,
  advanceDate,
  type TaskStatus,
} from '@/app/lib/schemas/recurring-maintenance'
import type { ActionState } from '@/app/lib/types'

function parseTaskForm(formData: FormData) {
  return TaskUpsertSchema.safeParse({
    scope: formData.get('scope'),
    property_id: formData.get('property_id'),
    unit_id: formData.get('unit_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    frequency_value: formData.get('frequency_value'),
    frequency_unit: formData.get('frequency_unit'),
    next_due_date: formData.get('next_due_date'),
    lead_time_days: formData.get('lead_time_days'),
    vendor_name: formData.get('vendor_name'),
    vendor_phone: formData.get('vendor_phone'),
    vendor_email: formData.get('vendor_email'),
  })
}

export async function createRecurringTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseTaskForm(formData)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: created, error } = await supabase
    .from('recurring_maintenance_tasks')
    .insert({
      owner_id: user.id,
      property_id:
        parsed.data.scope === 'property' ? parsed.data.property_id : null,
      unit_id: parsed.data.scope === 'unit' ? parsed.data.unit_id : null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      frequency_value: parsed.data.frequency_value,
      frequency_unit: parsed.data.frequency_unit,
      next_due_date: parsed.data.next_due_date,
      lead_time_days: parsed.data.lead_time_days,
      vendor_name: parsed.data.vendor_name ?? null,
      vendor_phone: parsed.data.vendor_phone ?? null,
      vendor_email: parsed.data.vendor_email ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: error?.message ?? 'Could not create task.',
    }
  }

  revalidatePath('/dashboard/maintenance/recurring')
  redirect('/dashboard/maintenance/recurring')
}

export async function updateRecurringTask(
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseTaskForm(formData)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('recurring_maintenance_tasks')
    .update({
      property_id:
        parsed.data.scope === 'property' ? parsed.data.property_id : null,
      unit_id: parsed.data.scope === 'unit' ? parsed.data.unit_id : null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      frequency_value: parsed.data.frequency_value,
      frequency_unit: parsed.data.frequency_unit,
      next_due_date: parsed.data.next_due_date,
      lead_time_days: parsed.data.lead_time_days,
      vendor_name: parsed.data.vendor_name ?? null,
      vendor_phone: parsed.data.vendor_phone ?? null,
      vendor_email: parsed.data.vendor_email ?? null,
    })
    .eq('id', taskId)

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/maintenance/recurring')
  return { success: true }
}

// Mark complete: writes a completion row, advances next_due_date,
// updates last_completed_*.
export async function completeRecurringTask(
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CompleteTaskSchema.safeParse({
    completed_on: formData.get('completed_on'),
    notes: formData.get('notes'),
    cost_cents: formData.get('cost_dollars'), // form field is dollars
    vendor_used: formData.get('vendor_used'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: task } = await supabase
    .from('recurring_maintenance_tasks')
    .select('id, owner_id, frequency_value, frequency_unit')
    .eq('id', taskId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = task as any
  if (!t || t.owner_id !== user.id) {
    return { success: false, message: 'Not your task.' }
  }

  const { error: completionErr } = await supabase
    .from('recurring_maintenance_completions')
    .insert({
      owner_id: user.id,
      task_id: taskId,
      completed_on: parsed.data.completed_on,
      notes: parsed.data.notes ?? null,
      cost_cents: parsed.data.cost_cents,
      vendor_used: parsed.data.vendor_used ?? null,
    })

  if (completionErr) {
    return { success: false, message: completionErr.message }
  }

  // Advance next_due_date
  const newDue = advanceDate(
    parsed.data.completed_on,
    t.frequency_value as number,
    t.frequency_unit as 'days' | 'weeks' | 'months' | 'years',
  )

  await supabase
    .from('recurring_maintenance_tasks')
    .update({
      next_due_date: newDue,
      last_completed_at: new Date(
        parsed.data.completed_on + 'T12:00:00Z',
      ).toISOString(),
      last_completed_notes: parsed.data.notes ?? null,
    })
    .eq('id', taskId)

  revalidatePath('/dashboard/maintenance/recurring')
  revalidatePath(`/dashboard/maintenance/recurring/${taskId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('recurring_maintenance_tasks')
    .update({ status })
    .eq('id', taskId)
  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/maintenance/recurring')
  revalidatePath(`/dashboard/maintenance/recurring/${taskId}`)
  return { success: true }
}

export async function deleteRecurringTask(
  taskId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('recurring_maintenance_tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/maintenance/recurring')
  redirect('/dashboard/maintenance/recurring')
}
