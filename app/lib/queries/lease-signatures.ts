// ============================================================
// Lease signature read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import type { LeaseSignature } from '@/app/lib/schemas/lease-signature'

export type LeaseSignatureSet = {
  tenant: LeaseSignature | null
  landlord: LeaseSignature | null
  bothSigned: boolean
}

export async function getLeaseSignatureSet(
  leaseId: string,
): Promise<LeaseSignatureSet> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('lease_signatures')
    .select('*')
    .eq('lease_id', leaseId)
    .order('created_at', { ascending: false })

  if (error) {
    return { tenant: null, landlord: null, bothSigned: false }
  }

  const rows = (data ?? []) as LeaseSignature[]
  // Latest non-voided per party (rows are ordered desc)
  let tenant: LeaseSignature | null = null
  let landlord: LeaseSignature | null = null
  for (const r of rows) {
    if (r.status === 'voided') continue
    if (r.party === 'tenant' && !tenant) tenant = r
    if (r.party === 'landlord' && !landlord) landlord = r
    if (tenant && landlord) break
  }

  return {
    tenant,
    landlord,
    bothSigned:
      tenant?.status === 'signed' && landlord?.status === 'signed',
  }
}

// Token lookup uses the service-role client because the tenant
// signing flow is unauthenticated. The token IS the credential.
export type SigningContext = {
  signature: LeaseSignature
  lease: {
    id: string
    monthly_rent: number
    start_date: string
    end_date: string
    tenant_name: string
    property_name: string
    unit_number: string | null
    landlord_name: string
  } | null
}

export async function getSigningContextByToken(
  token: string,
): Promise<SigningContext | null> {
  if (!token || token.length < 16) return null

  const supabase = getServiceRoleClient()
  const { data: row, error } = await supabase
    .from('lease_signatures')
    .select(
      `*,
       lease:leases (
         id, monthly_rent, start_date, end_date, owner_id,
         tenant:tenants ( first_name, last_name ),
         unit:units (
           unit_number,
           property:properties ( name )
         )
       )`,
    )
    .eq('sign_token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (error || !row) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any

  // Token expiry check
  if (
    r.token_expires_at &&
    new Date(r.token_expires_at).getTime() < Date.now()
  ) {
    return { signature: r as LeaseSignature, lease: null }
  }

  // Resolve landlord display name from company profile (no auth required;
  // this is a public-safe fact analogous to the apply page).
  let landlordName = 'Your landlord'
  if (r.lease?.owner_id) {
    const { data: profile } = await supabase
      .from('landlord_settings')
      .select('company_name')
      .eq('owner_id', r.lease.owner_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((profile as any)?.company_name) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landlordName = (profile as any).company_name
    }
  }

  const tenantName = r.lease?.tenant
    ? `${r.lease.tenant.first_name ?? ''} ${r.lease.tenant.last_name ?? ''}`.trim() ||
      'Tenant'
    : 'Tenant'

  return {
    signature: r as LeaseSignature,
    lease: r.lease
      ? {
          id: r.lease.id,
          monthly_rent: Number(r.lease.monthly_rent),
          start_date: r.lease.start_date,
          end_date: r.lease.end_date,
          tenant_name: tenantName,
          property_name: r.lease.unit?.property?.name ?? 'Property',
          unit_number: r.lease.unit?.unit_number ?? null,
          landlord_name: landlordName,
        }
      : null,
  }
}
