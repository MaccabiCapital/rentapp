'use server'

// ============================================================
// Listings server actions
// ============================================================
//
// createListing / updateListing / deleteListing — landlord side,
// uses the regular server client with owner_id RLS.
//
// submitInquiry — PUBLIC, called from /listings/[slug] form by
// unauthenticated visitors. Uses the service role client because
// the prospect write has to happen on behalf of the landlord
// without the visitor being logged in.
//
// Security layers on submitInquiry:
//   1. Zod validation on all inputs
//   2. Cloudflare Turnstile verification (rejects if invalid)
//   3. Honeypot field ("website") silently drops bot submissions
//   4. Slug lookup verifies the listing exists and is active
//   5. owner_id is pulled from the listing row — caller cannot spoof

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import {
  ListingCreateSchema,
  ListingUpdateSchema,
  ListingInquirySchema,
  buildSlug,
} from '@/app/lib/schemas/listing'
import { verifyTurnstile } from '@/app/lib/turnstile'
import type { ActionState } from '@/app/lib/types'
import {
  generateListingCopy,
  type ListingCopyResult,
} from '@/app/lib/listings/copy-generator'

function parseListingForm(formData: FormData) {
  return {
    property_id: formData.get('property_id'),
    unit_id: formData.get('unit_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    headline_rent: formData.get('headline_rent'),
    available_on: formData.get('available_on'),
    contact_email: formData.get('contact_email'),
    contact_phone: formData.get('contact_phone'),
    is_active: formData.get('is_active'),
  }
}

// Generate a unique slug by trying the base first, then -2, -3, etc.
async function generateUniqueSlug(source: string): Promise<string> {
  const supabase = await createServerClient()
  const base = buildSlug(source)
  if (!base) {
    return buildSlug(`listing-${Date.now()}`)
  }
  // Try the base, then -2 through -9
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('slug', candidate)
      .is('deleted_at', null)
      .maybeSingle()
    if (!data) return candidate
  }
  // Fallback: append a timestamp
  return `${base}-${Date.now()}`
}

export async function createListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ListingCreateSchema.safeParse(parseListingForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in to create a listing.' }
  }

  // Look up the property name so we can generate a sensible slug
  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', parsed.data.property_id)
    .maybeSingle()
  if (!property) {
    return { success: false, message: 'Property not found.' }
  }

  // Slug source: "Property name Unit X" or just property name
  let slugSource = property.name as string
  if (parsed.data.unit_id) {
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number')
      .eq('id', parsed.data.unit_id)
      .maybeSingle()
    if (unit?.unit_number) {
      slugSource = `${property.name} unit ${unit.unit_number}`
    }
  }
  const slug = await generateUniqueSlug(slugSource)

  const { data: created, error } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      property_id: parsed.data.property_id,
      unit_id: parsed.data.unit_id ?? null,
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      headline_rent: parsed.data.headline_rent ?? null,
      available_on: parsed.data.available_on ?? null,
      contact_email: parsed.data.contact_email ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      is_active: parsed.data.is_active,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      success: false,
      message: `Failed to create listing: ${error?.message ?? 'unknown error'}`,
    }
  }

  revalidatePath('/dashboard/listings')
  redirect(`/dashboard/listings/${created.id}`)
}

export async function updateListing(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ListingUpdateSchema.safeParse(parseListingForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('listings')
    .update({
      property_id: parsed.data.property_id,
      unit_id: parsed.data.unit_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      headline_rent: parsed.data.headline_rent ?? null,
      available_on: parsed.data.available_on ?? null,
      contact_email: parsed.data.contact_email ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      is_active: parsed.data.is_active,
    })
    .eq('id', id)

  if (error) {
    return {
      success: false,
      message: `Failed to update listing: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${id}`)
  redirect(`/dashboard/listings/${id}`)
}

export async function deleteListing(id: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to delete listing.' }
  }

  revalidatePath('/dashboard/listings')
  redirect('/dashboard/listings')
}

export async function toggleListingActive(
  id: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: current } = await supabase
    .from('listings')
    .select('is_active')
    .eq('id', id)
    .maybeSingle()
  if (!current) return { success: false, message: 'Listing not found.' }

  const { error } = await supabase
    .from('listings')
    .update({ is_active: !current.is_active })
    .eq('id', id)

  if (error) {
    return { success: false, message: 'Failed to toggle listing state.' }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${id}`)
  return { success: true }
}

// ============================================================
// PUBLIC: inquiry submission from /listings/[slug]
// ============================================================
//
// This is the only route in the app that accepts unauthenticated
// writes to the database. Every layer below is load-bearing —
// don't remove any without replacing it.

export async function submitInquiry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Layer 1: schema validation
  const raw = {
    slug: formData.get('slug'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    message: formData.get('message'),
    cfTurnstileResponse: formData.get('cfTurnstileResponse'),
    website: formData.get('website'),
  }
  const parsed = ListingInquirySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  // Layer 2: honeypot. Bots fill in "website", humans never see it.
  // Silently succeed so the bot moves on without realizing it was blocked.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return {
      success: true,
    }
  }

  // Layer 3: Turnstile verification
  const hdrs = await headers()
  const remoteIp =
    hdrs.get('cf-connecting-ip') ??
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  const turnstile = await verifyTurnstile(
    parsed.data.cfTurnstileResponse,
    remoteIp,
  )
  if (!turnstile.ok) {
    return {
      success: false,
      message: 'Captcha verification failed. Please refresh and try again.',
    }
  }

  // Layer 4: slug lookup (service-role because the visitor isn't
  // authenticated). Verify the listing exists and is active.
  const service = getServiceRoleClient()
  const { data: listing, error: lookupErr } = await service
    .from('listings')
    .select('id, owner_id, unit_id, property_id, inquiry_count')
    .eq('slug', parsed.data.slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (lookupErr || !listing) {
    return {
      success: false,
      message: 'This listing is no longer available.',
    }
  }

  // Layer 5: create a prospect row owned by the listing's owner.
  // RLS is bypassed by the service role client; owner_id comes
  // from the server-side listing row, not from form input, so
  // the caller can't spoof whose pipeline they land in.
  const { error: prospectErr } = await service.from('prospects').insert({
    owner_id: listing.owner_id,
    unit_id: listing.unit_id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name ?? null,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    stage: 'inquired',
    source: 'landing_page',
    inquiry_message: parsed.data.message ?? null,
    notes: `Submitted via public listing page "${parsed.data.slug}".`,
  })

  if (prospectErr) {
    return {
      success: false,
      message: 'Could not submit your inquiry. Please try again in a moment.',
    }
  }

  // Increment the listing's inquiry counter
  await service
    .from('listings')
    .update({ inquiry_count: (listing.inquiry_count ?? 0) + 1 })
    .eq('id', listing.id)

  revalidatePath(`/listings/${parsed.data.slug}`)
  return { success: true }
}

// ============================================================
// View counter bump — called from the public page on each render.
// Uses the anon client + public RLS. Not authenticated, but the
// RLS policy allows SELECT on active listings; we need a write
// path that doesn't require auth. We do it through the service
// role so RLS doesn't block it.
// ============================================================

// ============================================================
// Listing copy AI generator (landlord-side, authenticated)
// ============================================================
//
// Generates a fair-housing-safe description from the property/
// unit facts. Returns the proposed copy + any scan findings; the
// landlord pastes it into the form themselves. We do NOT auto-
// save — the human stays in the loop.

export type GenerateListingCopyResult =
  | { success: true; result: ListingCopyResult }
  | { success: false; message: string }

export async function generateListingCopyAction(
  formData: FormData,
): Promise<GenerateListingCopyResult> {
  const propertyId = String(formData.get('property_id') ?? '').trim()
  const unitId = (() => {
    const v = String(formData.get('unit_id') ?? '').trim()
    return v.length > 0 ? v : null
  })()
  const headlineRent = (() => {
    const v = String(formData.get('headline_rent') ?? '').trim()
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  })()
  const availableOn = (() => {
    const v = String(formData.get('available_on') ?? '').trim()
    return v.length > 0 ? v : null
  })()
  const highlights = (() => {
    const v = String(formData.get('highlights') ?? '').trim()
    return v.length > 0 ? v : null
  })()

  if (!propertyId) {
    return { success: false, message: 'Pick a property first.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // RLS-gated: only the owner sees their own property/unit.
  const { data: property, error: propertyErr } = await supabase
    .from('properties')
    .select('id, name, city, state')
    .eq('id', propertyId)
    .is('deleted_at', null)
    .maybeSingle()

  if (propertyErr || !property) {
    return { success: false, message: 'Property not found.' }
  }

  let unitNumber: string | null = null
  let bedrooms: number | null = null
  let bathrooms: number | null = null
  let squareFeet: number | null = null

  if (unitId) {
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number, bedrooms, bathrooms, square_feet')
      .eq('id', unitId)
      .is('deleted_at', null)
      .maybeSingle()
    if (unit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = unit as any
      unitNumber = u.unit_number ?? null
      bedrooms = u.bedrooms ?? null
      bathrooms = u.bathrooms ?? null
      squareFeet = u.square_feet ?? null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = property as any
  const jurisdiction =
    p.state && typeof p.state === 'string' && p.state.length === 2
      ? p.state.toUpperCase()
      : 'US'

  const result = await generateListingCopy({
    context: {
      propertyName: p.name,
      city: p.city ?? null,
      state: p.state ?? null,
      unitNumber,
      bedrooms,
      bathrooms,
      squareFeet,
      monthlyRent: headlineRent,
      availableOn,
      highlights,
    },
    jurisdiction,
  })

  return { success: true, result }
}

export async function incrementListingView(slug: string): Promise<void> {
  const service = getServiceRoleClient()
  const { data: listing } = await service
    .from('listings')
    .select('id, view_count')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (!listing) return
  await service
    .from('listings')
    .update({ view_count: (listing.view_count ?? 0) + 1 })
    .eq('id', listing.id)
}
