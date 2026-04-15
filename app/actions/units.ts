'use server'

// ============================================================
// Unit server actions
// ============================================================
//
// NOTE: Sprint 3 refactor path (red team Q3) — `unit.status` will
// become auto-managed by the lease state machine with manual
// override. Sprint 1 keeps it as a plain user-edited field; do
// not over-engineer anticipating the lease-state refactor.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { UnitCreateSchema, UnitUpdateSchema } from '@/app/lib/schemas/unit'
import type { ActionState } from '@/app/lib/types'

function parseUnitForm(formData: FormData) {
  return {
    unit_number: formData.get('unit_number'),
    bedrooms: formData.get('bedrooms'),
    bathrooms: formData.get('bathrooms'),
    square_feet: formData.get('square_feet'),
    monthly_rent: formData.get('monthly_rent'),
    security_deposit: formData.get('security_deposit'),
    status: formData.get('status'),
  }
}

export async function createUnit(
  propertyId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UnitCreateSchema.safeParse(parseUnitForm(formData))

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'You must be signed in to create a unit.' }
  }

  const { error } = await supabase.from('units').insert({
    owner_id: user.id,
    property_id: propertyId,
    unit_number: parsed.data.unit_number ?? null,
    bedrooms: parsed.data.bedrooms ?? null,
    bathrooms: parsed.data.bathrooms ?? null,
    square_feet: parsed.data.square_feet ?? null,
    monthly_rent: parsed.data.monthly_rent,
    security_deposit: parsed.data.security_deposit ?? null,
    status: parsed.data.status,
  })

  if (error) {
    return { success: false, message: 'Failed to create unit. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/properties/${propertyId}`)
  redirect(`/dashboard/properties/${propertyId}`)
}

export async function updateUnit(
  id: string,
  propertyId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UnitUpdateSchema.safeParse(parseUnitForm(formData))

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('units')
    .update({
      unit_number: parsed.data.unit_number ?? null,
      bedrooms: parsed.data.bedrooms ?? null,
      bathrooms: parsed.data.bathrooms ?? null,
      square_feet: parsed.data.square_feet ?? null,
      monthly_rent: parsed.data.monthly_rent,
      security_deposit: parsed.data.security_deposit ?? null,
      status: parsed.data.status,
    })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to update unit. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/dashboard/properties/${propertyId}/units/${id}`)
  redirect(`/dashboard/properties/${propertyId}/units/${id}`)
}

export async function deleteUnit(
  id: string,
  propertyId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('units')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete unit. Please try again.' }
  }

  revalidatePath('/dashboard/properties')
  revalidatePath(`/dashboard/properties/${propertyId}`)
  redirect(`/dashboard/properties/${propertyId}`)
}
