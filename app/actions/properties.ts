'use server'

// ============================================================
// Property server actions
// ============================================================
//
// All three actions (create, update, delete) are authenticated
// via RLS — we set owner_id from the JWT on insert, and RLS
// silently blocks update/delete on rows the user doesn't own.
// No manual authorization check needed beyond reading the user.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { PropertyCreateSchema, PropertyUpdateSchema } from '@/app/lib/schemas/property'
import { countActiveUnitsForProperty } from '@/app/lib/queries/units'
import type { ActionState } from '@/app/lib/types'

export async function createProperty(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = PropertyCreateSchema.safeParse({
    name: formData.get('name'),
    street_address: formData.get('street_address'),
    city: formData.get('city'),
    state: formData.get('state'),
    postal_code: formData.get('postal_code'),
    country: formData.get('country'),
    property_type: formData.get('property_type'),
    year_built: formData.get('year_built'),
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
    return { success: false, message: 'You must be signed in to create a property.' }
  }

  const { error } = await supabase.from('properties').insert({
    owner_id: user.id,
    name: parsed.data.name,
    street_address: parsed.data.street_address,
    city: parsed.data.city,
    state: parsed.data.state,
    postal_code: parsed.data.postal_code,
    country: parsed.data.country,
    property_type: parsed.data.property_type ?? null,
    year_built: parsed.data.year_built ?? null,
    notes: parsed.data.notes ?? null,
  })

  if (error) {
    return { success: false, message: 'Failed to create property. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  redirect('/dashboard/properties')
}

export async function updateProperty(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = PropertyUpdateSchema.safeParse({
    name: formData.get('name'),
    street_address: formData.get('street_address'),
    city: formData.get('city'),
    state: formData.get('state'),
    postal_code: formData.get('postal_code'),
    country: formData.get('country'),
    property_type: formData.get('property_type'),
    year_built: formData.get('year_built'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('properties')
    .update({
      name: parsed.data.name,
      street_address: parsed.data.street_address,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postal_code,
      country: parsed.data.country,
      property_type: parsed.data.property_type ?? null,
      year_built: parsed.data.year_built ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update property. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/properties/${id}`)
  redirect(`/dashboard/properties/${id}`)
}

// NOTE: Cascade tradeoff (red team Q2) — Sprint 1 forces the
// landlord to delete units first. Customer interviews will decide
// whether to add batch-delete or a cascade option in Sprint 2.
// Soft-delete audit trail matters more than convenience for beta.
export async function deleteProperty(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()

  const activeUnits = await countActiveUnitsForProperty(id)
  if (activeUnits > 0) {
    return {
      success: false,
      message: 'Remove all units before deleting this property.',
    }
  }

  const { error } = await supabase
    .from('properties')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete property. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  redirect('/dashboard/properties')
}
