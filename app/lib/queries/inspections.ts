// ============================================================
// Inspection read queries
// ============================================================
//
// Queries hydrate lease + unit + property + tenant names so the
// UI shows a useful header without N+1 drilling. Signed photo
// URLs are not generated here — the detail page component does
// that so list pages stay cheap.

import { createServerClient } from '@/lib/supabase/server'
import type {
  Inspection,
  InspectionItem,
} from '@/app/lib/schemas/inspection'

export type InspectionWithContext = Inspection & {
  lease: {
    id: string
    start_date: string
    end_date: string
    tenant: { id: string; first_name: string; last_name: string } | null
    unit: {
      id: string
      unit_number: string | null
      property: { id: string; name: string } | null
    } | null
  } | null
  item_count: number
  rated_count: number
}

type LeaseContextRow = {
  id: string
  start_date: string
  end_date: string
  tenant: { id: string; first_name: string; last_name: string } | null
  unit: {
    id: string
    unit_number: string | null
    property: { id: string; name: string } | null
  } | null
}

const LEASE_CONTEXT_SELECT = `
  id,
  start_date,
  end_date,
  tenant:tenants ( id, first_name, last_name ),
  unit:units ( id, unit_number, property:properties ( id, name ) )
`

async function hydrateItemCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  inspectionIds: string[],
): Promise<Map<string, { total: number; rated: number }>> {
  const map = new Map<string, { total: number; rated: number }>()
  if (inspectionIds.length === 0) return map

  const { data, error } = await supabase
    .from('inspection_items')
    .select('inspection_id, condition')
    .in('inspection_id', inspectionIds)
  if (error) throw error

  for (const row of (data ?? []) as Array<{
    inspection_id: string
    condition: string | null
  }>) {
    const existing = map.get(row.inspection_id) ?? { total: 0, rated: 0 }
    existing.total += 1
    if (row.condition !== null) existing.rated += 1
    map.set(row.inspection_id, existing)
  }
  return map
}

export async function getInspections(): Promise<InspectionWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('inspections')
    .select(
      `
      *,
      lease:leases ( ${LEASE_CONTEXT_SELECT} )
    `,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as Array<
    Inspection & { lease: LeaseContextRow | null }
  >

  const counts = await hydrateItemCounts(
    supabase,
    rows.map((r) => r.id),
  )

  return rows.map((r) => {
    const c = counts.get(r.id) ?? { total: 0, rated: 0 }
    return { ...r, item_count: c.total, rated_count: c.rated }
  })
}

export async function getInspection(
  id: string,
): Promise<{
  inspection: InspectionWithContext
  items: InspectionItem[]
} | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('inspections')
    .select(
      `
      *,
      lease:leases ( ${LEASE_CONTEXT_SELECT} )
    `,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const header = data as Inspection & { lease: LeaseContextRow | null }

  const { data: itemRows, error: itemErr } = await supabase
    .from('inspection_items')
    .select('*')
    .eq('inspection_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemErr) throw itemErr

  const items = (itemRows ?? []) as InspectionItem[]
  const ratedCount = items.filter((i) => i.condition !== null).length

  return {
    inspection: {
      ...header,
      item_count: items.length,
      rated_count: ratedCount,
    },
    items,
  }
}

// Lightweight list of leases for the new-inspection picker. We
// only need enough to render a dropdown with a meaningful label.
export type LeasePickerRow = {
  id: string
  tenant_name: string
  unit_label: string
  property_name: string
  status: string
}

export async function getLeasesForPicker(): Promise<LeasePickerRow[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leases')
    .select(
      `
      id,
      status,
      tenant:tenants ( first_name, last_name ),
      unit:units ( unit_number, property:properties ( name ) )
    `,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    tenant_name: r.tenant
      ? `${r.tenant.first_name} ${r.tenant.last_name}`.trim()
      : 'Unknown tenant',
    unit_label: r.unit?.unit_number ?? 'Unit',
    property_name: r.unit?.property?.name ?? 'Unknown property',
  }))
}

// Dashboard summary for the overview card.
export async function getInspectionSummary(): Promise<{
  total: number
  drafts: number
  awaitingSignature: number
}> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('inspections')
    .select('id, status')
    .is('deleted_at', null)
  if (error) throw error

  let total = 0
  let drafts = 0
  let awaitingSignature = 0
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    total += 1
    if (r.status === 'draft' || r.status === 'in_progress') drafts += 1
    if (r.status === 'completed') awaitingSignature += 1
  }
  return { total, drafts, awaitingSignature }
}
