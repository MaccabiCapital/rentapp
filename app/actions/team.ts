'use server'

// ============================================================
// Team member server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  TeamMemberCreateSchema,
  TeamMemberUpdateSchema,
} from '@/app/lib/schemas/team'
import type { ActionState } from '@/app/lib/types'

function parseTeamForm(formData: FormData) {
  return {
    full_name: formData.get('full_name'),
    company_name: formData.get('company_name'),
    role: formData.get('role'),
    is_primary: formData.get('is_primary'),
    is_active: formData.get('is_active'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    alt_phone: formData.get('alt_phone'),
    preferred_contact: formData.get('preferred_contact') || 'phone',
    license_number: formData.get('license_number'),
    license_state: formData.get('license_state'),
    hourly_rate: formData.get('hourly_rate'),
    rate_notes: formData.get('rate_notes'),
    specialty: formData.get('specialty'),
    available_24_7: formData.get('available_24_7'),
    notes: formData.get('notes'),
  }
}

export async function createTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TeamMemberCreateSchema.safeParse(parseTeamForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to add a team member.' }
  }

  const { data: created, error } = await supabase
    .from('team_members')
    .insert({
      owner_id: user.id,
      full_name: parsed.data.full_name ?? null,
      company_name: parsed.data.company_name ?? null,
      role: parsed.data.role,
      is_primary: parsed.data.is_primary,
      is_active: parsed.data.is_active,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      alt_phone: parsed.data.alt_phone ?? null,
      preferred_contact: parsed.data.preferred_contact,
      license_number: parsed.data.license_number ?? null,
      license_state: parsed.data.license_state ?? null,
      hourly_rate: parsed.data.hourly_rate ?? null,
      rate_notes: parsed.data.rate_notes ?? null,
      specialty: parsed.data.specialty ?? null,
      available_24_7: parsed.data.available_24_7,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to add team member: ${error?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath('/dashboard/team')
  redirect(`/dashboard/team/${created.id}`)
}

export async function updateTeamMember(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TeamMemberUpdateSchema.safeParse(parseTeamForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('team_members')
    .update({
      full_name: parsed.data.full_name ?? null,
      company_name: parsed.data.company_name ?? null,
      role: parsed.data.role,
      is_primary: parsed.data.is_primary,
      is_active: parsed.data.is_active,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      alt_phone: parsed.data.alt_phone ?? null,
      preferred_contact: parsed.data.preferred_contact,
      license_number: parsed.data.license_number ?? null,
      license_state: parsed.data.license_state ?? null,
      hourly_rate: parsed.data.hourly_rate ?? null,
      rate_notes: parsed.data.rate_notes ?? null,
      specialty: parsed.data.specialty ?? null,
      available_24_7: parsed.data.available_24_7,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)

  if (error) {
    return {
      success: false,
      message: `Failed to update team member: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/team')
  revalidatePath(`/dashboard/team/${id}`)
  redirect(`/dashboard/team/${id}`)
}

export async function deleteTeamMember(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('team_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete team member.' }
  }

  revalidatePath('/dashboard/team')
  redirect('/dashboard/team')
}

// Called from maintenance/expense actions after a job is
// assigned or expense logged against a team member, to update
// their denormalized usage counters. Safe to call even if the
// member id is null (no-op).
export async function touchTeamMemberUsage(
  memberId: string | null,
  amount: number,
): Promise<void> {
  if (!memberId) return
  const supabase = await createServerClient()
  // Fetch current counters (we can't do an atomic increment via
  // PostgREST without an RPC, but the race window is small).
  const { data: existing } = await supabase
    .from('team_members')
    .select('total_jobs_ytd, total_spend_ytd')
    .eq('id', memberId)
    .maybeSingle()
  if (!existing) return

  const newJobs = (existing.total_jobs_ytd ?? 0) + 1
  const newSpend = Number(existing.total_spend_ytd ?? 0) + amount
  const today = new Date().toISOString().slice(0, 10)

  await supabase
    .from('team_members')
    .update({
      total_jobs_ytd: newJobs,
      total_spend_ytd: newSpend,
      last_used_on: today,
    })
    .eq('id', memberId)
}
