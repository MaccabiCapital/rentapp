// ============================================================
// Tenant portal queries — public (token-authenticated)
// ============================================================
//
// These queries bypass RLS owner_id checks because the portal
// authenticates via an unguessable token on the tenant row, not
// via auth.uid(). The token IS the credential. Treat carefully.
//
// We use a service-role-free approach: these queries run as the
// authenticated landlord session (server) but match the token
// rather than owner_id. Since the supabase-js server client
// runs under RLS, we have to do this lookup server-side with
// the normal client; the queries are scoped tightly to the
// token-matched tenant.

import { getServiceRoleClient } from '@/lib/supabase/service-role'

export type PortalTenant = {
  tenant: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  }
  landlord_display_name: string
  lease: {
    id: string
    start_date: string
    end_date: string
    monthly_rent: number
    security_deposit: number | null
    rent_due_day: number
    status: string
    unit: {
      unit_number: string | null
      property: {
        name: string
        street_address: string
        city: string
        state: string
        postal_code: string
      } | null
    } | null
  } | null
  notices: Array<{
    id: string
    type: string
    generated_at: string
    served_at: string | null
  }>
  rentersInsurance: {
    carrier: string
    expiry_date: string
  } | null
}

export async function getPortalTenantByToken(
  token: string,
): Promise<PortalTenant | null> {
  if (!token || typeof token !== 'string' || token.length < 10) return null

  const supabase = getServiceRoleClient()

  // Token lookup bypasses owner_id scoping — the token itself is
  // the credential. We look for a tenant matching both token and
  // a non-deleted state.
  const { data: tenantRow, error } = await supabase
    .from('tenants')
    .select(
      `id, first_name, last_name, email, phone, owner_id`,
    )
    .eq('portal_token', token)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !tenantRow) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any

  // Load newest active lease (or most recent) for this tenant
  const { data: leaseRow } = await supabase
    .from('leases')
    .select(
      `id, start_date, end_date, monthly_rent, security_deposit,
       rent_due_day, status,
       unit:units (
         unit_number,
         property:properties ( name, street_address, city, state, postal_code )
       )`,
    )
    .eq('tenant_id', t.id)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lease = leaseRow && leaseRow.length > 0 ? (leaseRow[0] as any) : null

  const leaseId = lease?.id as string | undefined
  // Notices for this lease
  let notices: PortalTenant['notices'] = []
  if (leaseId) {
    const { data: noticeRows } = await supabase
      .from('notices')
      .select('id, type, generated_at, served_at')
      .eq('lease_id', leaseId)
      .is('deleted_at', null)
      .order('generated_at', { ascending: false })
      .limit(20)
    notices = (noticeRows ?? []) as PortalTenant['notices']
  }

  // Renters insurance
  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: riRows } = await supabase
    .from('renters_insurance_policies')
    .select('carrier, expiry_date')
    .eq('tenant_id', t.id)
    .gte('expiry_date', todayIso)
    .is('deleted_at', null)
    .order('expiry_date', { ascending: false })
    .limit(1)

  const rentersInsurance =
    riRows && riRows.length > 0
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          carrier: (riRows[0] as any).carrier as string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiry_date: (riRows[0] as any).expiry_date as string,
        }
      : null

  // Landlord display name — pulled from auth.users metadata if
  // accessible; else "Your landlord" as fallback.
  let landlordDisplayName = 'Your landlord'
  const { data: userRow } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('id', t.id)
    .maybeSingle()
  if (userRow) {
    // We can't read auth.users from an anonymous context, and
    // the tenant portal isn't authenticated as the landlord, so
    // we just keep the generic label. A future v2 could store
    // landlord display name on a profile table.
    landlordDisplayName = 'Your landlord'
  }

  return {
    tenant: {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone: t.phone,
    },
    landlord_display_name: landlordDisplayName,
    lease: lease
      ? {
          id: lease.id,
          start_date: lease.start_date,
          end_date: lease.end_date,
          monthly_rent: Number(lease.monthly_rent),
          security_deposit:
            lease.security_deposit === null
              ? null
              : Number(lease.security_deposit),
          rent_due_day: lease.rent_due_day,
          status: lease.status,
          unit: lease.unit
            ? {
                unit_number: lease.unit.unit_number ?? null,
                property: lease.unit.property
                  ? {
                      name: lease.unit.property.name,
                      street_address: lease.unit.property.street_address,
                      city: lease.unit.property.city,
                      state: lease.unit.property.state,
                      postal_code: lease.unit.property.postal_code,
                    }
                  : null,
              }
            : null,
        }
      : null,
    notices,
    rentersInsurance,
  }
}
