// ============================================================
// Notice read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { Notice, NoticeType } from '@/app/lib/schemas/notice'

export type NoticeWithContext = Notice & {
  lease: {
    id: string
    start_date: string
    end_date: string
    monthly_rent: number
    tenant: { id: string; first_name: string; last_name: string } | null
    unit: {
      id: string
      unit_number: string | null
      property: {
        id: string
        name: string
        street_address: string | null
        city: string | null
        state: string | null
        postal_code: string | null
      } | null
    } | null
  } | null
}

const LEASE_CONTEXT_SELECT = `
  id,
  start_date,
  end_date,
  monthly_rent,
  tenant:tenants ( id, first_name, last_name ),
  unit:units (
    id,
    unit_number,
    property:properties (
      id, name, street_address, city, state, postal_code
    )
  )
`

export async function getNotices(): Promise<NoticeWithContext[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('notices')
    .select(`*, lease:leases ( ${LEASE_CONTEXT_SELECT} )`)
    .is('deleted_at', null)
    .order('generated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as NoticeWithContext[]
}

export async function getNotice(
  id: string,
): Promise<NoticeWithContext | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('notices')
    .select(`*, lease:leases ( ${LEASE_CONTEXT_SELECT} )`)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return data as NoticeWithContext
}

export async function getNoticesForLease(
  leaseId: string,
): Promise<Notice[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('lease_id', leaseId)
    .is('deleted_at', null)
    .order('generated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Notice[]
}

export type NoticeSummary = {
  total: number
  unserved: number
  byType: Record<NoticeType, number>
}

export async function getNoticeSummary(): Promise<NoticeSummary> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('notices')
    .select('type, served_at')
    .is('deleted_at', null)
  if (error) throw error

  const byType: Record<string, number> = {}
  let total = 0
  let unserved = 0
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    total += 1
    if (!r.served_at) unserved += 1
    byType[r.type] = (byType[r.type] ?? 0) + 1
  }
  return {
    total,
    unserved,
    byType: byType as Record<NoticeType, number>,
  }
}
