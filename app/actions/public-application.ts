'use server'

// ============================================================
// Public rental application submission (anonymous visitor)
// ============================================================
//
// Called from `/apply/[slug]` when a prospect submits their
// application. Uses the service-role client because the visitor
// isn't authenticated. Validates the listing slug, resolves the
// unit + owner, then creates a prospect with stage
// 'application_received' and the application details in notes.
//
// If the applicant uploaded supporting documents (pay stubs,
// bank statements, employer letter, ID), persist each as an
// application_documents row + storage object, scoped to the
// landlord's owner_id and the new prospect_id.

import { getServiceRoleClient } from '@/lib/supabase/service-role'
import { uploadApplicationDocumentPublic } from '@/app/lib/storage/application-documents'
import {
  APPLICATION_DOCUMENT_KIND_VALUES,
  type ApplicationDocumentKind,
} from '@/app/lib/schemas/screening'

export type PublicApplicationResult =
  | { success: true; prospectId: string; documentsUploaded: number }
  | { success: false; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function positiveNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function trimmedString(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t === '' ? null : t
}

export async function submitApplication(
  _prev: PublicApplicationResult | { success: boolean },
  formData: FormData,
): Promise<PublicApplicationResult> {
  const slug = trimmedString(formData.get('slug'))
  if (!slug) {
    return { success: false, message: 'Missing listing reference.' }
  }

  const firstName = trimmedString(formData.get('first_name'))
  const lastName = trimmedString(formData.get('last_name'))
  const email = trimmedString(formData.get('email'))
  const phone = trimmedString(formData.get('phone'))

  if (!firstName || !lastName) {
    return {
      success: false,
      message: 'Please enter your first and last name.',
    }
  }
  if (!email && !phone) {
    return {
      success: false,
      message: 'Please provide an email or phone so the landlord can reach you.',
    }
  }
  if (email && !EMAIL_RE.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const desiredMoveIn = trimmedString(formData.get('desired_move_in'))
  const employer = trimmedString(formData.get('employer'))
  const monthlyIncome = positiveNumber(formData.get('monthly_income'))
  const employmentType = trimmedString(formData.get('employment_type'))
  const previousAddress = trimmedString(formData.get('previous_address'))
  const reasonForMoving = trimmedString(formData.get('reason_for_moving'))
  const householdSize = positiveNumber(formData.get('household_size'))
  const hasPets = trimmedString(formData.get('has_pets'))
  const additionalNotes = trimmedString(formData.get('additional_notes'))

  const supabase = getServiceRoleClient()

  // Resolve listing → unit + owner
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, unit_id, property_id, title')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!listing) {
    return {
      success: false,
      message: 'This listing is no longer accepting applications.',
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l = listing as any

  // Compose the inquiry message from application fields
  const appLines = [
    `Applied through listing: ${l.title}`,
    desiredMoveIn ? `Desired move-in: ${desiredMoveIn}` : null,
    employer ? `Employer: ${employer}` : null,
    employmentType ? `Employment: ${employmentType}` : null,
    monthlyIncome !== null
      ? `Monthly income: $${monthlyIncome.toLocaleString()}`
      : null,
    householdSize !== null ? `Household size: ${householdSize}` : null,
    hasPets ? `Pets: ${hasPets}` : null,
    previousAddress ? `Previous address: ${previousAddress}` : null,
    reasonForMoving ? `Reason for moving: ${reasonForMoving}` : null,
    additionalNotes ? `Notes: ${additionalNotes}` : null,
  ].filter((v): v is string => v !== null)

  const { data: created, error } = await supabase
    .from('prospects')
    .insert({
      owner_id: l.owner_id,
      unit_id: l.unit_id,
      first_name: firstName,
      last_name: lastName,
      email: email ?? null,
      phone: phone ?? null,
      stage: 'application_received',
      source: 'listing_page_application',
      inquiry_message: appLines.join('\n'),
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `We couldn't submit your application. Please try again or contact the landlord directly.`,
    }
  }

  // Persist any uploaded documents. Each kind has its own form
  // field name like 'document_pay_stub'. Failures don't block the
  // application — the prospect is already created; documents can
  // be re-uploaded by the landlord later.
  let documentsUploaded = 0
  for (const kind of APPLICATION_DOCUMENT_KIND_VALUES) {
    const fileEntry = formData.get(`document_${kind}`)
    if (!(fileEntry instanceof File) || fileEntry.size === 0) continue

    const upload = await uploadApplicationDocumentPublic({
      ownerId: l.owner_id,
      prospectId: created.id,
      kind: kind as ApplicationDocumentKind,
      file: fileEntry,
    })
    if (!upload.success) continue

    const { error: docErr } = await supabase
      .from('application_documents')
      .insert({
        owner_id: l.owner_id,
        prospect_id: created.id,
        public_application_token: null,
        kind,
        storage_path: upload.storagePath,
        original_filename: fileEntry.name,
        byte_size: upload.byteSize,
        mime_type: upload.mimeType,
      })
    if (!docErr) documentsUploaded += 1
  }

  return { success: true, prospectId: created.id, documentsUploaded }
}
