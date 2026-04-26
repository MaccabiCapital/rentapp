'use server'

// ============================================================
// Proof Check (screening) server actions
// ============================================================
//
// All screening writes live here. The engine itself runs
// synchronously inside createScreeningReport / rerunScreeningReport
// for v1 (a 1-2s job doesn't justify a queue). Audit-log entries
// are written by the engine and by the actions for landlord events
// (decision_recorded, document_uploaded, document_deleted).

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { runScreeningEngine } from '@/app/lib/screening/engine'
import {
  uploadApplicationDocumentAsLandlord,
  deleteStoredDocument,
} from '@/app/lib/storage/application-documents'
import {
  RecordDecisionSchema,
  APPLICATION_DOCUMENT_KIND_VALUES,
  type ApplicationDocumentKind,
} from '@/app/lib/schemas/screening'
import type { ActionState } from '@/app/lib/types'

// ------------------------------------------------------------
// Create + run a new screening report
// ------------------------------------------------------------

export async function createScreeningReport(
  prospectId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in to run screening.' }
  }

  // Verify the prospect is owned by this user. Stated facts
  // (income, employer, etc.) currently live in the inquiry_message
  // free-text field on prospects — a future migration will lift
  // them to structured columns so they can be snapshotted onto
  // the screening report.
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .select('id, owner_id')
    .eq('id', prospectId)
    .is('deleted_at', null)
    .maybeSingle()

  if (pErr || !prospect) {
    return {
      success: false,
      message: pErr?.message ?? 'Prospect not found.',
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((prospect as any).owner_id !== user.id) {
    return { success: false, message: 'Not your prospect.' }
  }

  const { data: created, error } = await supabase
    .from('screening_reports')
    .insert({
      owner_id: user.id,
      prospect_id: prospectId,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: error?.message ?? 'Could not create report.',
    }
  }

  // Audit log: report_created
  await supabase.from('screening_audit_log').insert({
    owner_id: user.id,
    report_id: created.id,
    prospect_id: prospectId,
    event: 'report_created',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  // Run the engine synchronously
  await runScreeningEngine(created.id)

  revalidatePath(`/dashboard/prospects/${prospectId}`)
  revalidatePath(`/dashboard/prospects/${prospectId}/screening`)
  return { success: true }
}

// ------------------------------------------------------------
// Re-run an existing report (after fixing data, adding documents)
// ------------------------------------------------------------

export async function rerunScreeningReport(
  reportId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in.' }
  }

  // Verify ownership
  const { data: report } = await supabase
    .from('screening_reports')
    .select('id, owner_id, prospect_id')
    .eq('id', reportId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = report as any
  if (!r || r.owner_id !== user.id) {
    return { success: false, message: 'Not your report.' }
  }

  await supabase.from('screening_audit_log').insert({
    owner_id: user.id,
    report_id: reportId,
    prospect_id: r.prospect_id,
    event: 'run_started',
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  await runScreeningEngine(reportId)

  revalidatePath(`/dashboard/prospects/${r.prospect_id}`)
  revalidatePath(`/dashboard/prospects/${r.prospect_id}/screening`)
  return { success: true }
}

// ------------------------------------------------------------
// Landlord uploads a document on behalf of a prospect
// ------------------------------------------------------------

export async function uploadProspectDocument(
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const kind = formData.get('kind')
  const file = formData.get('file')

  if (
    typeof kind !== 'string' ||
    !APPLICATION_DOCUMENT_KIND_VALUES.includes(
      kind as ApplicationDocumentKind,
    )
  ) {
    return { success: false, errors: { kind: ['Pick a document type.'] } }
  }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, errors: { file: ['Pick a file to upload.'] } }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in.' }
  }

  // Verify the prospect is owned by this user
  const { data: prospect } = await supabase
    .from('prospects')
    .select('id, owner_id')
    .eq('id', prospectId)
    .is('deleted_at', null)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!prospect || (prospect as any).owner_id !== user.id) {
    return { success: false, message: 'Not your prospect.' }
  }

  const upload = await uploadApplicationDocumentAsLandlord({
    ownerId: user.id,
    prospectId,
    kind: kind as ApplicationDocumentKind,
    file,
  })
  if (!upload.success) {
    return { success: false, message: upload.reason }
  }

  const { data: doc, error } = await supabase
    .from('application_documents')
    .insert({
      owner_id: user.id,
      prospect_id: prospectId,
      kind,
      storage_path: upload.storagePath,
      original_filename: file.name,
      byte_size: upload.byteSize,
      mime_type: upload.mimeType,
    })
    .select('id')
    .single()

  if (error || !doc) {
    return {
      success: false,
      message: error?.message ?? 'Upload metadata insert failed.',
    }
  }

  await supabase.from('screening_audit_log').insert({
    owner_id: user.id,
    report_id: null,
    prospect_id: prospectId,
    event: 'document_uploaded',
    event_data: { document_id: doc.id, kind },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath(`/dashboard/prospects/${prospectId}/screening`)
  return { success: true }
}

// ------------------------------------------------------------
// Delete a document (soft) + clean storage object
// ------------------------------------------------------------

export async function deleteProspectDocument(
  documentId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in.' }
  }

  const { data: doc } = await supabase
    .from('application_documents')
    .select('id, owner_id, prospect_id, storage_path')
    .eq('id', documentId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any
  if (!d || d.owner_id !== user.id) {
    return { success: false, message: 'Not your document.' }
  }

  await supabase
    .from('application_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId)

  await deleteStoredDocument(d.storage_path)

  await supabase.from('screening_audit_log').insert({
    owner_id: user.id,
    prospect_id: d.prospect_id,
    event: 'document_deleted',
    event_data: { document_id: documentId },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath(`/dashboard/prospects/${d.prospect_id}/screening`)
  return { success: true }
}

// ------------------------------------------------------------
// Record the landlord's decision
// ------------------------------------------------------------

export async function recordScreeningDecision(
  reportId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = RecordDecisionSchema.safeParse({
    decision: formData.get('decision'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Sign in.' }
  }

  const { data: report } = await supabase
    .from('screening_reports')
    .select('id, owner_id, prospect_id')
    .eq('id', reportId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = report as any
  if (!r || r.owner_id !== user.id) {
    return { success: false, message: 'Not your report.' }
  }

  const nowIso = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('screening_reports')
    .update({
      landlord_decision: parsed.data.decision,
      landlord_decision_at: nowIso,
      landlord_decision_notes: parsed.data.notes ?? null,
    })
    .eq('id', reportId)

  if (updErr) return { success: false, message: updErr.message }

  // Mirror decision back to the prospect stage where applicable
  const stageMap: Record<string, string> = {
    approved: 'approved',
    rejected: 'declined',
    requested_more_info: 'application_received',
  }
  const newStage = stageMap[parsed.data.decision]
  if (newStage) {
    await supabase
      .from('prospects')
      .update({ stage: newStage })
      .eq('id', r.prospect_id)
  }

  await supabase.from('screening_audit_log').insert({
    owner_id: user.id,
    report_id: reportId,
    prospect_id: r.prospect_id,
    event: 'decision_recorded',
    event_data: {
      decision: parsed.data.decision,
      notes: parsed.data.notes ?? null,
    },
    actor_user_id: user.id,
    actor_kind: 'landlord',
  })

  revalidatePath(`/dashboard/prospects/${r.prospect_id}`)
  revalidatePath(`/dashboard/prospects/${r.prospect_id}/screening`)
  return { success: true }
}
