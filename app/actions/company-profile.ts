'use server'

// ============================================================
// Company profile server actions
// ============================================================
//
// Upsert the landlord_settings row for the current user with
// company branding + contact + default policies. Logo upload is
// a separate action because file uploads use multipart/form-data.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  CompanyProfileUpsertSchema,
} from '@/app/lib/schemas/company-profile'
import {
  uploadLandlordLogo,
  deleteLandlordLogo,
} from '@/app/lib/storage/landlord-branding'
import type { ActionState } from '@/app/lib/types'

export async function updateCompanyProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CompanyProfileUpsertSchema.safeParse({
    company_name: formData.get('company_name'),
    brand_color: formData.get('brand_color'),
    website: formData.get('website'),
    business_email: formData.get('business_email'),
    business_phone: formData.get('business_phone'),
    business_street_address: formData.get('business_street_address'),
    business_unit: formData.get('business_unit'),
    business_city: formData.get('business_city'),
    business_state: formData.get('business_state'),
    business_postal_code: formData.get('business_postal_code'),
    default_notice_period_days: formData.get('default_notice_period_days'),
    default_late_fee_amount: formData.get('default_late_fee_amount'),
    default_grace_period_days: formData.get('default_grace_period_days'),
    default_pet_policy: formData.get('default_pet_policy'),
    business_hours: formData.get('business_hours'),
    quiet_hours: formData.get('quiet_hours'),
    emergency_contact: formData.get('emergency_contact'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in.' }
  }

  // Convert undefined → null for nullable columns; keep what schema produced.
  const payload = {
    owner_id: user.id,
    company_name: parsed.data.company_name ?? null,
    brand_color: parsed.data.brand_color ?? null,
    website: parsed.data.website ?? null,
    business_email: parsed.data.business_email ?? null,
    business_phone: parsed.data.business_phone ?? null,
    business_street_address: parsed.data.business_street_address ?? null,
    business_unit: parsed.data.business_unit ?? null,
    business_city: parsed.data.business_city ?? null,
    business_state: parsed.data.business_state?.toUpperCase() ?? null,
    business_postal_code: parsed.data.business_postal_code ?? null,
    default_notice_period_days: parsed.data.default_notice_period_days,
    default_late_fee_amount: parsed.data.default_late_fee_amount,
    default_grace_period_days: parsed.data.default_grace_period_days,
    default_pet_policy: parsed.data.default_pet_policy ?? null,
    business_hours: parsed.data.business_hours ?? null,
    quiet_hours: parsed.data.quiet_hours ?? null,
    emergency_contact: parsed.data.emergency_contact ?? null,
  }

  const { error } = await supabase
    .from('landlord_settings')
    .upsert(payload, { onConflict: 'owner_id' })

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/settings/company')
  revalidatePath('/dashboard/compliance')
  return { success: true }
}

export async function uploadCompanyLogo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, errors: { logo: ['Pick a logo to upload.'] } }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const upload = await uploadLandlordLogo({ ownerId: user.id, file })
  if (!upload.success) {
    return { success: false, message: upload.reason }
  }

  const { error } = await supabase
    .from('landlord_settings')
    .upsert(
      { owner_id: user.id, logo_storage_path: upload.storagePath },
      { onConflict: 'owner_id' },
    )
  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/settings/company')
  return { success: true }
}

export async function removeCompanyLogo(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: row } = await supabase
    .from('landlord_settings')
    .select('logo_storage_path')
    .eq('owner_id', user.id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = (row as any)?.logo_storage_path as string | undefined
  if (path) {
    await deleteLandlordLogo(path)
  }

  await supabase
    .from('landlord_settings')
    .upsert(
      { owner_id: user.id, logo_storage_path: null },
      { onConflict: 'owner_id' },
    )

  revalidatePath('/dashboard/settings/company')
  return { success: true }
}
