'use server'

// ============================================================
// FairScreen (compliance) server actions
// ============================================================
//
// v1 scope: scanListingCopy, acknowledgeFinding, dismissFinding,
// markFindingFixed. Criteria authoring + disparate-impact + PDF
// rendering deferred to follow-up phases.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { scanListingCopyDeterministic } from '@/app/lib/compliance/listing-scanner'
import {
  ScanListingCopySchema,
  DismissFindingSchema,
} from '@/app/lib/schemas/compliance'
import type { ActionState } from '@/app/lib/types'

// ------------------------------------------------------------
// Scan listing copy
// ------------------------------------------------------------

export type ScanListingResult =
  | {
      success: true
      jurisdiction: string
      rulesEvaluated: number
      findingsPersisted: number
    }
  | { success: false; errors: Record<string, string[]> }
  | { success: false; message: string }

export async function scanListingCopy(
  _prev: ScanListingResult | { success: boolean },
  formData: FormData,
): Promise<ScanListingResult> {
  const parsed = ScanListingCopySchema.safeParse({
    listing_id: formData.get('listing_id'),
    jurisdiction: formData.get('jurisdiction'),
    copy: formData.get('copy'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to scan listings.' }
  }

  let result
  try {
    result = scanListingCopyDeterministic({
      copy: parsed.data.copy,
      jurisdiction: parsed.data.jurisdiction,
      listingId: parsed.data.listing_id ?? null,
    })
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Scan failed.',
    }
  }

  // Persist findings + audit log
  let findingsPersisted = 0
  if (result.findings.length > 0) {
    const inserts = result.findings.map((f) => ({
      owner_id: user.id,
      ...f,
    }))
    const { data: inserted, error: insErr } = await supabase
      .from('compliance_findings')
      .insert(inserts)
      .select('id')
    if (insErr) {
      return { success: false, message: insErr.message }
    }
    findingsPersisted = (inserted ?? []).length
  }

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    event: 'listing_scanned',
    event_data: {
      jurisdiction: result.jurisdiction,
      rules_evaluated: result.rulesEvaluated,
      findings_count: findingsPersisted,
      listing_id: parsed.data.listing_id ?? null,
    },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/findings')

  return {
    success: true,
    jurisdiction: result.jurisdiction,
    rulesEvaluated: result.rulesEvaluated,
    findingsPersisted,
  }
}

// ------------------------------------------------------------
// Findings inbox actions
// ------------------------------------------------------------

export async function acknowledgeFinding(
  findingId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { error } = await supabase
    .from('compliance_findings')
    .update({ status: 'acknowledged' })
    .eq('id', findingId)
  if (error) return { success: false, message: error.message }

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    finding_id: findingId,
    event: 'finding_acknowledged',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })
  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/findings')
  return { success: true }
}

export async function markFindingFixed(
  findingId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { error } = await supabase
    .from('compliance_findings')
    .update({ status: 'fixed' })
    .eq('id', findingId)
  if (error) return { success: false, message: error.message }

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    finding_id: findingId,
    event: 'finding_fixed',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })
  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/findings')
  return { success: true }
}

export async function dismissFinding(
  findingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = DismissFindingSchema.safeParse({
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('compliance_findings')
    .update({
      status: 'dismissed',
      dismissed_reason: parsed.data.reason,
      dismissed_at: nowIso,
      dismissed_by: user.id,
    })
    .eq('id', findingId)
  if (error) return { success: false, message: error.message }

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    finding_id: findingId,
    event: 'finding_dismissed',
    event_data: { reason: parsed.data.reason },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })
  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/findings')
  return { success: true }
}
