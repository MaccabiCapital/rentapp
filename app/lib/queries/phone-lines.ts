// ============================================================
// Landlord phone line queries
// ============================================================
//
// Dashboard reads — secrets stripped. The webhook route does its
// own service-role lookup when it needs the webhook_secret for
// HMAC verification.

import { createServerClient } from '@/lib/supabase/server'
import type {
  LandlordPhoneLine,
  LandlordPhoneLinePublic,
  LineType,
} from '@/app/lib/schemas/phone-lines'

const PUBLIC_COLUMNS =
  'id, owner_id, line_type, twilio_number, retell_agent_id, status, a2p_brand_id, a2p_campaign_id, created_at, updated_at'

export async function getPhoneLines(): Promise<LandlordPhoneLinePublic[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('landlord_phone_lines')
    .select(PUBLIC_COLUMNS)
    .order('line_type', { ascending: true })
  if (error) throw error
  return (data ?? []) as LandlordPhoneLinePublic[]
}

export async function getPhoneLineByType(
  lineType: LineType,
): Promise<LandlordPhoneLinePublic | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('landlord_phone_lines')
    .select(PUBLIC_COLUMNS)
    .eq('line_type', lineType)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as LandlordPhoneLinePublic | null
}

// Internal helper for the webhook route. Uses the service role
// client (RLS-bypassing) to look up the full row including the
// webhook secret. Do NOT call this from dashboard contexts.
export async function getPhoneLineForWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceRoleClient: any,
  ownerId: string,
  lineType: LineType,
): Promise<LandlordPhoneLine | null> {
  const { data, error } = await serviceRoleClient
    .from('landlord_phone_lines')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('line_type', lineType)
    .maybeSingle()
  if (error) return null
  return (data ?? null) as LandlordPhoneLine | null
}
