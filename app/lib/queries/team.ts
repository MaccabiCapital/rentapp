// ============================================================
// Team member read queries
// ============================================================

import { createServerClient } from '@/lib/supabase/server'
import type { TeamMember, TeamRole } from '@/app/lib/schemas/team'

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('is_primary', { ascending: false })
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamMember[]
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as TeamMember | null
}

// Used by the TeamMemberPicker typeahead on the maintenance and
// expense forms. Returns a lightweight projection — no need to
// pull every field for a dropdown.
export type TeamPickerOption = {
  id: string
  role: TeamRole
  display_name: string
  company_name: string | null
  phone: string | null
  email: string | null
  hourly_rate: number | null
  specialty: string | null
  is_primary: boolean
  available_24_7: boolean
}

export async function getTeamMembersForPicker(
  role?: TeamRole | TeamRole[],
): Promise<TeamPickerOption[]> {
  const supabase = await createServerClient()
  let query = supabase
    .from('team_members')
    .select(
      'id, role, full_name, company_name, phone, email, hourly_rate, specialty, is_primary, available_24_7',
    )
    .is('deleted_at', null)
    .eq('is_active', true)

  if (role) {
    if (Array.isArray(role)) {
      query = query.in('role', role)
    } else {
      query = query.eq('role', role)
    }
  }

  const { data, error } = await query
    .order('is_primary', { ascending: false })
    .order('full_name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const person = (r.full_name as string | null)?.trim() ?? ''
    const company = (r.company_name as string | null)?.trim() ?? ''
    const display_name =
      person && company
        ? `${person} (${company})`
        : person || company || 'Unnamed'
    return {
      id: r.id,
      role: r.role,
      display_name,
      company_name: r.company_name,
      phone: r.phone,
      email: r.email,
      hourly_rate: r.hourly_rate !== null ? Number(r.hourly_rate) : null,
      specialty: r.specialty,
      is_primary: !!r.is_primary,
      available_24_7: !!r.available_24_7,
    }
  })
}

// Emergency-dispatch helper: "who do I call at 3am for a burst pipe?"
// Returns only 24/7-available active members, sorted by usage.
export async function getEmergencyTeamMembers(): Promise<TeamPickerOption[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('team_members')
    .select(
      'id, role, full_name, company_name, phone, email, hourly_rate, specialty, is_primary, available_24_7',
    )
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('available_24_7', true)
    .order('total_jobs_ytd', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const person = (r.full_name as string | null)?.trim() ?? ''
    const company = (r.company_name as string | null)?.trim() ?? ''
    return {
      id: r.id,
      role: r.role,
      display_name:
        person && company ? `${person} (${company})` : person || company || 'Unnamed',
      company_name: r.company_name,
      phone: r.phone,
      email: r.email,
      hourly_rate: r.hourly_rate !== null ? Number(r.hourly_rate) : null,
      specialty: r.specialty,
      is_primary: !!r.is_primary,
      available_24_7: true,
    }
  })
}

// Cost rollup for the team member detail page. Pulls recent
// expenses + maintenance jobs where vendor/assigned_to matches
// the member by display name (best-effort since those fields
// are free text today).
export type TeamUsageRow = {
  source: 'expense' | 'maintenance'
  id: string
  date: string
  title: string
  amount: number
}

export async function getTeamMemberUsage(
  memberId: string,
): Promise<{ rows: TeamUsageRow[]; total: number }> {
  const supabase = await createServerClient()
  const { data: member } = await supabase
    .from('team_members')
    .select('full_name, company_name')
    .eq('id', memberId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!member) return { rows: [], total: 0 }

  // Build match candidates so "Joe the Plumber", "Joe Plumbing",
  // and "Joe" all link back. We search the vendor field with
  // case-insensitive LIKE patterns on any non-empty token.
  const needles = [member.full_name, member.company_name]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
  if (needles.length === 0) return { rows: [], total: 0 }

  const orFilter = needles
    .map((n) => `vendor.ilike.%${n.replace(/%/g, '')}%`)
    .join(',')

  const [{ data: expenses }, { data: maintenance }] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, incurred_on, description, vendor, amount')
      .is('deleted_at', null)
      .or(orFilter)
      .order('incurred_on', { ascending: false })
      .limit(50),
    supabase
      .from('maintenance_requests')
      .select('id, created_at, resolved_at, title, assigned_to, cost_materials, cost_labor')
      .or(
        needles
          .map((n) => `assigned_to.ilike.%${n.replace(/%/g, '')}%`)
          .join(','),
      )
      .order('resolved_at', { ascending: false, nullsFirst: false })
      .limit(50),
  ])

  const rows: TeamUsageRow[] = []
  for (const e of expenses ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = e as any
    rows.push({
      source: 'expense',
      id: row.id,
      date: row.incurred_on,
      title: row.description ?? row.vendor ?? 'Expense',
      amount: Number(row.amount ?? 0),
    })
  }
  for (const m of maintenance ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = m as any
    const total = Number(row.cost_materials ?? 0) + Number(row.cost_labor ?? 0)
    rows.push({
      source: 'maintenance',
      id: row.id,
      date: row.resolved_at ?? row.created_at,
      title: row.title,
      amount: total,
    })
  }

  rows.sort((a, b) => (a.date < b.date ? 1 : -1))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return { rows, total }
}
