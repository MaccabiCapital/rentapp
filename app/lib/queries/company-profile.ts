// ============================================================
// Company profile read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { CompanyProfile } from '@/app/lib/schemas/company-profile'

const PROFILE_COLUMNS = `
  owner_id,
  company_name, logo_storage_path, brand_color, website,
  business_email, business_phone, business_street_address,
  business_unit, business_city, business_state, business_postal_code,
  default_notice_period_days, default_late_fee_amount,
  default_grace_period_days, default_pet_policy,
  business_hours, quiet_hours, emergency_contact
`

export async function getMyCompanyProfile(): Promise<CompanyProfile | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('landlord_settings')
    .select(PROFILE_COLUMNS)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    ...r,
    default_late_fee_amount:
      r.default_late_fee_amount === null
        ? null
        : Number(r.default_late_fee_amount),
  } as CompanyProfile
}

// Used by PDF renderers / email templates. Doesn't require a
// session — looks up by explicit owner_id. Read-side only;
// runs under whichever client is passed.
export async function getCompanyProfileForOwner(
  ownerId: string,
): Promise<CompanyProfile | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('landlord_settings')
    .select(PROFILE_COLUMNS)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error || !data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    ...r,
    default_late_fee_amount:
      r.default_late_fee_amount === null
        ? null
        : Number(r.default_late_fee_amount),
  } as CompanyProfile
}
