// ============================================================
// Shared lease + unit context loader for workflow coordinators
// ============================================================
//
// Every workflow needs the same anchor data: lease + tenant +
// unit + property. This module factors out that load plus the
// "does X record exist?" checks used to infer step completion.

import { createServerClient } from '@/lib/supabase/server'

export type WorkflowLease = {
  id: string
  status: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number | null
  late_fee_amount: number | null
  late_fee_grace_days: number | null
  tenant_notice_given_on: string | null
  signed_at: string | null
  turnover_strategy: 'list_during_notice' | 'wait_until_vacant' | null
  tenant: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  } | null
  unit: {
    id: string
    unit_number: string | null
    status: string
    property: {
      id: string
      name: string
      state: string | null
    } | null
  } | null
}

export type WorkflowUnit = {
  id: string
  unit_number: string | null
  status: string
  bedrooms: number | null
  bathrooms: number | null
  monthly_rent: number | null
  property: {
    id: string
    name: string
    state: string | null
  } | null
}

const LEASE_SELECT = `
  id, status, start_date, end_date, monthly_rent, security_deposit,
  late_fee_amount, late_fee_grace_days,
  tenant_notice_given_on, signed_at, turnover_strategy,
  tenant:tenants ( id, first_name, last_name, email, phone ),
  unit:units (
    id, unit_number, status,
    property:properties ( id, name, state )
  )
`

export async function loadWorkflowLease(
  id: string,
): Promise<WorkflowLease | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select(LEASE_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as WorkflowLease
}

export async function loadWorkflowUnit(
  id: string,
): Promise<WorkflowUnit | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('units')
    .select(
      `id, unit_number, status, bedrooms, bathrooms, monthly_rent,
       property:properties ( id, name, state )`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as WorkflowUnit
}

// ------------------------------------------------------------
// Step-completion checks
// ------------------------------------------------------------

export async function latestInspectionForLease(
  leaseId: string,
  type: 'move_in' | 'move_out' | 'periodic',
): Promise<{
  id: string
  status: string
  created_at: string
  completed_at: string | null
} | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('inspections')
    .select('id, status, created_at, completed_at')
    .eq('lease_id', leaseId)
    .eq('type', type)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return null
  return data[0] as {
    id: string
    status: string
    created_at: string
    completed_at: string | null
  }
}

export async function currentRentersInsuranceForTenant(
  tenantId: string,
): Promise<{
  id: string
  carrier: string
  expiry_date: string
} | null> {
  const supabase = await createServerClient()
  const todayIso = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('renters_insurance_policies')
    .select('id, carrier, expiry_date')
    .eq('tenant_id', tenantId)
    .gte('expiry_date', todayIso)
    .is('deleted_at', null)
    .order('expiry_date', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return null
  return data[0] as {
    id: string
    carrier: string
    expiry_date: string
  }
}

export async function latestNoticeForLease(
  leaseId: string,
  type:
    | 'rent_increase'
    | 'entry'
    | 'late_rent'
    | 'cure_or_quit'
    | 'terminate_tenancy'
    | 'move_out_info',
): Promise<{
  id: string
  served_at: string | null
  generated_at: string
} | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('notices')
    .select('id, served_at, generated_at')
    .eq('lease_id', leaseId)
    .eq('type', type)
    .is('deleted_at', null)
    .order('generated_at', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return null
  return data[0] as {
    id: string
    served_at: string | null
    generated_at: string
  }
}

export async function activeListingForUnit(
  unitId: string,
): Promise<{ id: string; slug: string; title: string } | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('listings')
    .select('id, slug, title')
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return null
  return data[0] as { id: string; slug: string; title: string }
}

// Find the next lease on the same unit after the current one — the
// "successor" used by the offboard workflow to surface the onboarding
// hand-off once a replacement tenant has signed.
export async function nextLeaseForUnit(
  unitId: string,
  excludeLeaseId: string,
): Promise<{
  id: string
  tenant_name: string
  status: string
  start_date: string
} | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('leases')
    .select(
      `id, status, start_date,
       tenant:tenants ( first_name, last_name )`,
    )
    .eq('unit_id', unitId)
    .neq('id', excludeLeaseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data[0] as any
  return {
    id: r.id as string,
    status: r.status as string,
    start_date: r.start_date as string,
    tenant_name: r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
      : 'Unknown tenant',
  }
}

export async function getLeasesForWorkflowPicker(
  filter?: 'active' | 'expiring' | 'notice_given',
): Promise<
  Array<{
    id: string
    tenant_name: string
    unit_label: string
    property_name: string
    status: string
    end_date: string
  }>
> {
  const supabase = await createServerClient()
  let q = supabase
    .from('leases')
    .select(
      `id, status, end_date, tenant_notice_given_on,
       tenant:tenants ( first_name, last_name ),
       unit:units ( unit_number, property:properties ( name ) )`,
    )
    .is('deleted_at', null)

  if (filter === 'active') {
    q = q.eq('status', 'active')
  } else if (filter === 'expiring') {
    const todayIso = new Date().toISOString().slice(0, 10)
    const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    q = q
      .eq('status', 'active')
      .gte('end_date', todayIso)
      .lte('end_date', in90)
  } else if (filter === 'notice_given') {
    q = q
      .eq('status', 'active')
      .not('tenant_notice_given_on', 'is', null)
  }

  q = q.order('end_date', { ascending: true })

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    return {
      id: r.id as string,
      status: r.status as string,
      end_date: r.end_date as string,
      tenant_name: r.tenant
        ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
        : 'Unknown tenant',
      unit_label: (r.unit?.unit_number as string | null) ?? 'Unit',
      property_name:
        (r.unit?.property?.name as string | null) ?? 'Unknown property',
    }
  })
}

export async function getUnitsForWorkflowPicker(
  filter?: 'vacant',
): Promise<
  Array<{
    id: string
    label: string
    property_name: string
    status: string
  }>
> {
  const supabase = await createServerClient()
  let q = supabase
    .from('units')
    .select(
      `id, unit_number, status, property:properties ( name )`,
    )
    .is('deleted_at', null)

  if (filter === 'vacant') {
    q = q.eq('status', 'vacant')
  }

  q = q.order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    return {
      id: r.id as string,
      label: (r.unit_number as string | null) ?? 'Unit',
      property_name:
        (r.property?.name as string | null) ?? 'Unknown property',
      status: r.status,
    }
  })
}
