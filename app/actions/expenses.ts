'use server'

// ============================================================
// Expense + manual-income server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
  ManualIncomeSchema,
} from '@/app/lib/schemas/expense'
import type { ActionState } from '@/app/lib/types'

function parseExpenseForm(formData: FormData) {
  return {
    property_id: formData.get('property_id'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    incurred_on: formData.get('incurred_on'),
    vendor: formData.get('vendor'),
    description: formData.get('description'),
    notes: formData.get('notes'),
  }
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ExpenseCreateSchema.safeParse(parseExpenseForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to add an expense.' }
  }

  const { error } = await supabase.from('expenses').insert({
    owner_id: user.id,
    property_id: parsed.data.property_id,
    category: parsed.data.category,
    amount: parsed.data.amount,
    incurred_on: parsed.data.incurred_on,
    vendor: parsed.data.vendor ?? null,
    description: parsed.data.description ?? null,
    notes: parsed.data.notes ?? null,
  })

  if (error) {
    return { success: false, message: 'Failed to log expense. Please try again.' }
  }

  revalidatePath('/dashboard/financials')
  redirect('/dashboard/financials')
}

export async function updateExpense(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ExpenseUpdateSchema.safeParse(parseExpenseForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('expenses')
    .update({
      property_id: parsed.data.property_id,
      category: parsed.data.category,
      amount: parsed.data.amount,
      incurred_on: parsed.data.incurred_on,
      vendor: parsed.data.vendor ?? null,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update expense. Please try again.' }
  }

  revalidatePath('/dashboard/financials')
  revalidatePath(`/dashboard/financials/expenses/${id}`)
  redirect('/dashboard/financials')
}

export async function deleteExpense(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete expense.' }
  }

  revalidatePath('/dashboard/financials')
  redirect('/dashboard/financials')
}

// Manual income entry — writes to public.payments with
// status='succeeded' and stripe_payment_intent_id=null. When
// Sprint 3 ships, Stripe will insert its own rows in the same
// table with status='processing' that the webhook handler
// advances to 'succeeded'. No schema change needed.
export async function recordManualPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ManualIncomeSchema.safeParse({
    lease_id: formData.get('lease_id'),
    amount: formData.get('amount'),
    received_on: formData.get('received_on'),
    payment_method: formData.get('payment_method'),
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
    return { success: false, message: 'You must be signed in to record a payment.' }
  }

  // Fetch the lease to get tenant_id (required on payments table).
  const { data: lease } = await supabase
    .from('leases')
    .select('id, tenant_id')
    .eq('id', parsed.data.lease_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!lease) {
    return { success: false, message: 'Lease not found.' }
  }

  const { error } = await supabase.from('payments').insert({
    owner_id: user.id,
    lease_id: lease.id,
    tenant_id: lease.tenant_id,
    amount: parsed.data.amount,
    status: 'succeeded',
    due_date: parsed.data.received_on,
    paid_at: new Date(parsed.data.received_on).toISOString(),
    payment_method: parsed.data.payment_method,
    notes: parsed.data.notes ?? null,
  })

  if (error) {
    return { success: false, message: 'Failed to record payment. Please try again.' }
  }

  revalidatePath('/dashboard/financials')
  redirect('/dashboard/financials')
}
