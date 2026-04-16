// ============================================================
// tenant_sms_identities queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { TenantSmsIdentity } from '@/app/lib/schemas/sms-identities'

export async function getSmsIdentitiesForTenant(
  tenantId: string,
): Promise<TenantSmsIdentity[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('tenant_sms_identities')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as TenantSmsIdentity[]
}

// Webhook helper — bypasses RLS via service role client to
// resolve an inbound E.164 number to the matching tenant for the
// given landlord.
export async function findTenantByPhoneForWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceRoleClient: any,
  ownerId: string,
  e164: string,
): Promise<{ tenant_id: string } | null> {
  const { data, error } = await serviceRoleClient
    .from('tenant_sms_identities')
    .select('tenant_id')
    .eq('owner_id', ownerId)
    .eq('phone_number', e164)
    .maybeSingle()
  if (error) return null
  return (data ?? null) as { tenant_id: string } | null
}
