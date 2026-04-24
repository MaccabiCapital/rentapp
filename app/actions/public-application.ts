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

import { getServiceRoleClient } from '@/lib/supabase/service-role'

export type PublicApplicationResult =
  | { success: true; prospectId: string }
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

  return { success: true, prospectId: created.id }
}
