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
import {
  runDisparateImpactForOwner,
  persistRunResult,
} from '@/app/lib/compliance/disparate-impact'
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
// Apply-suggestion writeback (listing scanner)
// ------------------------------------------------------------
//
// For listing-scan findings with a subject_listing_id, this rewrites
// the listing's description to remove the trigger phrase and marks
// the finding as fixed. Confirmation modal lives in the UI.
//
// Strategy: replace the exact trigger_text occurrence with the
// suggested_fix where available; otherwise replace with a placeholder
// "[removed for fair-housing compliance]". A future v2 can offer
// inline editing of the rewrite before applying.

export async function applyListingSuggestion(
  findingId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: finding } = await supabase
    .from('compliance_findings')
    .select(
      'id, owner_id, source, subject_listing_id, trigger_text, suggested_fix',
    )
    .eq('id', findingId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = finding as any
  if (!f || f.owner_id !== user.id) {
    return { success: false, message: 'Finding not found.' }
  }
  if (f.source !== 'listing_scan' || !f.subject_listing_id) {
    return {
      success: false,
      message: 'This finding is not on a listing — apply not supported.',
    }
  }
  if (!f.trigger_text) {
    return {
      success: false,
      message: 'No trigger phrase to replace.',
    }
  }

  // Pull the listing
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, description')
    .eq('id', f.subject_listing_id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l = listing as any
  if (!l || l.owner_id !== user.id) {
    return { success: false, message: 'Listing not found.' }
  }
  const original: string = (l.description as string | null) ?? ''
  if (!original.toLowerCase().includes(f.trigger_text.toLowerCase())) {
    // Description may have been edited since the scan
    return {
      success: false,
      message:
        "Couldn't find the flagged phrase in the current listing — it may have already been edited. Re-run the scan.",
    }
  }

  // Replace case-insensitively, preserving surrounding whitespace
  const escaped = (f.trigger_text as string).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
  const re = new RegExp(escaped, 'gi')
  const rewritten = original.replace(
    re,
    '[removed for fair-housing compliance]',
  )

  const { error: updErr } = await supabase
    .from('listings')
    .update({ description: rewritten })
    .eq('id', f.subject_listing_id)
  if (updErr) return { success: false, message: updErr.message }

  // Mark the finding fixed
  await supabase
    .from('compliance_findings')
    .update({ status: 'fixed' })
    .eq('id', findingId)

  await supabase.from('compliance_audit_log').insert({
    owner_id: user.id,
    finding_id: findingId,
    event: 'finding_fixed',
    event_data: {
      method: 'apply_listing_suggestion',
      listing_id: f.subject_listing_id,
      replaced_text: f.trigger_text,
    },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/findings')
  revalidatePath(`/dashboard/listings/${f.subject_listing_id}`)
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

  // Pull company profile so the PDF uses the configured business
  // name + mailing address instead of falling back to user metadata.
  const { data: profileRow } = await supabase
    .from('landlord_settings')
    .select(
      `company_name, logo_storage_path, business_email, business_phone,
       business_street_address, business_unit, business_city,
       business_state, business_postal_code`,
    )
    .eq('owner_id', user.id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRow as any

  const landlordName =
    profile?.company_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Landlord'

  // Sign the logo URL if a logo is configured. @react-pdf/renderer
  // fetches the image at render time, which works for short-lived
  // signed URLs (criteria PDFs are rendered on-demand).
  let logoUrl: string | null = null
  if (profile?.logo_storage_path) {
    const { data: signed } = await supabase.storage
      .from('landlord-branding')
      .createSignedUrl(profile.logo_storage_path, 60)
    logoUrl = signed?.signedUrl ?? null
  }

  // CriteriaPdf returns a <Document>; cast through unknown so
  // renderToBuffer's narrow ReactElement<DocumentProps> type accepts
  // the element produced by createElement on a function component.
  const pdfElement = createElement(CriteriaPdf, {
    criteria,
    jurisdictionName,
    version,
    generatedOn: new Date().toISOString().slice(0, 10),
    landlordName,
    businessAddress: profile
      ? {
          street: profile.business_street_address ?? null,
          unit: profile.business_unit ?? null,
          city: profile.business_city ?? null,
          state: profile.business_state ?? null,
          postal_code: profile.business_postal_code ?? null,
        }
      : null,
    businessEmail: profile?.business_email ?? null,
    businessPhone: profile?.business_phone ?? null,
    logoUrl,
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

// ------------------------------------------------------------
// Disparate-impact: manual trigger
// ------------------------------------------------------------
//
// Lets a landlord run the analysis on demand from the dashboard
// instead of waiting for the nightly cron. Same engine + persist
// path that the cron uses.

export async function runDisparateImpactNow(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  try {
    const result = await runDisparateImpactForOwner(user.id)
    await persistRunResult(result)
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Run failed.',
    }
  }

  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/compliance/disparate-impact')
  return { success: true }
}
