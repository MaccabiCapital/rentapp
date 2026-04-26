'use server'

// ============================================================
// FairScreen (compliance) server actions
// ============================================================
//
// v1 scope: scanListingCopy, finding inbox actions, criteria CRUD
// + publish + PDF generation. Disparate-impact engine deferred.

import { createElement } from 'react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { scanListingCopyDeterministic } from '@/app/lib/compliance/listing-scanner'
import { uploadCriteriaPdf } from '@/app/lib/storage/compliance-documents'
import { CriteriaPdf } from '@/app/ui/criteria-pdf'
import {
  ScanListingCopySchema,
  DismissFindingSchema,
  CriteriaUpsertSchema,
} from '@/app/lib/schemas/compliance'
import type {
  TenantSelectionCriteria,
  CriteriaUpsertInput,
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

// ------------------------------------------------------------
// Tenant Selection Criteria — create / update / publish / PDF
// ------------------------------------------------------------

function parseCriteriaForm(formData: FormData) {
  return CriteriaUpsertSchema.safeParse({
    name: formData.get('name'),
    jurisdiction: formData.get('jurisdiction'),
    income_multiple: formData.get('income_multiple'),
    min_credit_score: formData.get('min_credit_score'),
    max_evictions_lookback_years: formData.get('max_evictions_lookback_years'),
    max_eviction_count: formData.get('max_eviction_count'),
    accepts_section_8: formData.get('accepts_section_8'),
    accepts_other_vouchers: formData.get('accepts_other_vouchers'),
    criminal_history_lookback_years: formData.get(
      'criminal_history_lookback_years',
    ),
    pet_policy: formData.get('pet_policy'),
    occupancy_max_per_bedroom: formData.get('occupancy_max_per_bedroom'),
    additional_requirements: formData.get('additional_requirements'),
    reasonable_accommodations_statement: formData.get(
      'reasonable_accommodations_statement',
    ),
  })
}

function criteriaInsertPayload(input: CriteriaUpsertInput) {
  return {
    name: input.name,
    jurisdiction: input.jurisdiction.toUpperCase(),
    income_multiple: input.income_multiple,
    min_credit_score: input.min_credit_score,
    max_evictions_lookback_years: input.max_evictions_lookback_years,
    max_eviction_count: input.max_eviction_count,
    accepts_section_8: input.accepts_section_8,
    accepts_other_vouchers: input.accepts_other_vouchers,
    criminal_history_lookback_years: input.criminal_history_lookback_years,
    pet_policy: input.pet_policy ?? null,
    occupancy_max_per_bedroom: input.occupancy_max_per_bedroom ?? 2,
    additional_requirements: input.additional_requirements ?? null,
    reasonable_accommodations_statement:
      input.reasonable_accommodations_statement ?? null,
  }
}

async function snapshotVersion(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ownerId: string,
  criteria: TenantSelectionCriteria,
  pdfStoragePath: string | null,
): Promise<number> {
  // Compute the next version number
  const { data: lastRow } = await supabase
    .from('criteria_versions')
    .select('version')
    .eq('criteria_id', criteria.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextVersion = ((lastRow as any)?.version ?? 0) + 1

  await supabase.from('criteria_versions').insert({
    owner_id: ownerId,
    criteria_id: criteria.id,
    version: nextVersion,
    snapshot: criteria,
    pdf_storage_path: pdfStoragePath,
  })

  return nextVersion
}

export async function createCriteria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseCriteriaForm(formData)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to create criteria.' }
  }

  const { data: created, error } = await supabase
    .from('tenant_selection_criteria')
    .insert({
      owner_id: user.id,
      ...criteriaInsertPayload(parsed.data),
    })
    .select('*')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: error?.message ?? 'Could not create criteria.',
    }
  }

  // Initial version snapshot (no PDF until publish)
  await snapshotVersion(
    supabase,
    user.id,
    created as TenantSelectionCriteria,
    null,
  )

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    criteria_id: (created as TenantSelectionCriteria).id,
    event: 'criteria_created',
    event_data: { name: parsed.data.name, jurisdiction: parsed.data.jurisdiction },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/criteria')
  redirect(
    `/dashboard/compliance/criteria/${(created as TenantSelectionCriteria).id}`,
  )
}

export async function updateCriteria(
  criteriaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseCriteriaForm(formData)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: updated, error } = await supabase
    .from('tenant_selection_criteria')
    .update(criteriaInsertPayload(parsed.data))
    .eq('id', criteriaId)
    .eq('owner_id', user.id)
    .select('*')
    .single()

  if (error || !updated) {
    return {
      success: false,
      message: error?.message ?? 'Could not update criteria.',
    }
  }

  await snapshotVersion(
    supabase,
    user.id,
    updated as TenantSelectionCriteria,
    null,
  )

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    criteria_id: criteriaId,
    event: 'criteria_edited',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath(`/dashboard/compliance/criteria/${criteriaId}`)
  revalidatePath('/dashboard/compliance')
  return { success: true }
}

// Renders the PDF, uploads it, attaches to the latest version, and
// returns the storage path. Used by both publishCriteria and the
// standalone regenerate action.
async function renderAndStorePdf(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  user: { id: string; user_metadata?: Record<string, unknown>; email?: string | null },
  criteria: TenantSelectionCriteria,
): Promise<{ storagePath: string; version: number }> {
  const { data: rule } = await supabase
    .from('state_fair_housing_rules')
    .select('jurisdiction_name')
    .eq('jurisdiction', criteria.jurisdiction)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jurisdictionName = ((rule as any)?.jurisdiction_name as string) ??
    criteria.jurisdiction

  const { data: lastRow } = await supabase
    .from('criteria_versions')
    .select('version')
    .eq('criteria_id', criteria.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const version = ((lastRow as any)?.version ?? 0) || 1

  const landlordName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Landlord'

  // CriteriaPdf returns a <Document>; cast through unknown so
  // renderToBuffer's narrow ReactElement<DocumentProps> type accepts
  // the element produced by createElement on a function component.
  const pdfElement = createElement(CriteriaPdf, {
    criteria,
    jurisdictionName,
    version,
    generatedOn: new Date().toISOString().slice(0, 10),
    landlordName,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(pdfElement as any)

  const upload = await uploadCriteriaPdf({
    ownerId: user.id,
    criteriaId: criteria.id,
    version,
    pdfBytes: new Uint8Array(pdfBuffer),
  })
  if (!upload.success) {
    throw new Error(upload.reason)
  }

  // Attach to the criteria row + the version row
  await supabase
    .from('tenant_selection_criteria')
    .update({ pdf_storage_path: upload.storagePath })
    .eq('id', criteria.id)

  await supabase
    .from('criteria_versions')
    .update({ pdf_storage_path: upload.storagePath })
    .eq('criteria_id', criteria.id)
    .eq('version', version)

  return { storagePath: upload.storagePath, version }
}

export async function publishCriteria(
  criteriaId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: criteria, error } = await supabase
    .from('tenant_selection_criteria')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq('id', criteriaId)
    .eq('owner_id', user.id)
    .select('*')
    .single()

  if (error || !criteria) {
    return {
      success: false,
      message: error?.message ?? 'Could not publish.',
    }
  }

  try {
    await renderAndStorePdf(
      supabase,
      user,
      criteria as TenantSelectionCriteria,
    )
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'PDF render failed.',
    }
  }

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    criteria_id: criteriaId,
    event: 'criteria_published',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath(`/dashboard/compliance/criteria/${criteriaId}`)
  revalidatePath('/dashboard/compliance')
  return { success: true }
}

export async function regenerateCriteriaPdf(
  criteriaId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: criteria } = await supabase
    .from('tenant_selection_criteria')
    .select('*')
    .eq('id', criteriaId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!criteria) {
    return { success: false, message: 'Criteria not found.' }
  }

  try {
    await renderAndStorePdf(
      supabase,
      user,
      criteria as TenantSelectionCriteria,
    )
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'PDF render failed.',
    }
  }

  revalidatePath(`/dashboard/compliance/criteria/${criteriaId}`)
  return { success: true }
}

export async function deleteCriteria(criteriaId: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('tenant_selection_criteria')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', criteriaId)

  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/criteria')
  redirect('/dashboard/compliance/criteria')
}
