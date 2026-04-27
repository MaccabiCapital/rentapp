'use server'

// ============================================================
// Lease signature server actions
// ============================================================

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import {
  RecordSignatureSchema,
  VoidSignatureSchema,
} from '@/app/lib/schemas/lease-signature'
import {
  uploadSignatureImagePublic,
  uploadSignatureImageAsLandlord,
  dataUrlToBytes,
} from '@/app/lib/storage/lease-signatures'
import type { ActionState } from '@/app/lib/types'

const TOKEN_TTL_DAYS = 14

function generateToken(): string {
  // 32 bytes → ~43 base64url chars
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return Buffer.from(s, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ------------------------------------------------------------
// Landlord requests tenant signature → creates pending row + token
// ------------------------------------------------------------

export async function requestTenantSignature(
  leaseId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  // Verify lease ownership
  const { data: lease } = await supabase
    .from('leases')
    .select('id, owner_id')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!lease || (lease as any).owner_id !== user.id) {
    return { success: false, message: 'Not your lease.' }
  }

  // Void any existing pending tenant rows for this lease
  await supabase
    .from('lease_signatures')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_reason: 'Replaced by new request',
    })
    .eq('lease_id', leaseId)
    .eq('party', 'tenant')
    .eq('status', 'pending')

  const token = generateToken()
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { error } = await supabase.from('lease_signatures').insert({
    owner_id: user.id,
    lease_id: leaseId,
    party: 'tenant',
    status: 'pending',
    sign_token: token,
    token_expires_at: expiresAt,
  })

  if (error) return { success: false, message: error.message }

  revalidatePath(`/dashboard/tenants`)
  return { success: true }
}

// Void any pending tenant request (lets landlord regenerate the link)
export async function voidPendingSignature(
  signatureId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = VoidSignatureSchema.safeParse({
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('lease_signatures')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_reason: parsed.data.reason,
    })
    .eq('id', signatureId)
    .eq('status', 'pending')

  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/tenants')
  return { success: true }
}

// ------------------------------------------------------------
// Landlord signs from authenticated dashboard
// ------------------------------------------------------------

async function maybeStampLeaseSignedAt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  leaseId: string,
): Promise<void> {
  // If both parties have signed (active rows), stamp leases.signed_at
  const { data } = await supabase
    .from('lease_signatures')
    .select('party, status')
    .eq('lease_id', leaseId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  const tenantSigned = rows.some(
    (r) => r.party === 'tenant' && r.status === 'signed',
  )
  const landlordSigned = rows.some(
    (r) => r.party === 'landlord' && r.status === 'signed',
  )
  if (tenantSigned && landlordSigned) {
    await supabase
      .from('leases')
      .update({ signed_at: new Date().toISOString() })
      .eq('id', leaseId)
      .is('signed_at', null)
  }
}

export async function signLeaseAsLandlord(
  leaseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = RecordSignatureSchema.safeParse({
    typed_name: formData.get('typed_name'),
    signature_data_url: formData.get('signature_data_url'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { data: lease } = await supabase
    .from('leases')
    .select('id, owner_id')
    .eq('id', leaseId)
    .is('deleted_at', null)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!lease || (lease as any).owner_id !== user.id) {
    return { success: false, message: 'Not your lease.' }
  }

  // Void any prior pending landlord rows
  await supabase
    .from('lease_signatures')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_reason: 'Replaced by new signature',
    })
    .eq('lease_id', leaseId)
    .eq('party', 'landlord')
    .eq('status', 'pending')

  // Insert pending row to get an id, then upload image to it.
  const { data: created, error: insErr } = await supabase
    .from('lease_signatures')
    .insert({
      owner_id: user.id,
      lease_id: leaseId,
      party: 'landlord',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr || !created) {
    return {
      success: false,
      message: insErr?.message ?? 'Could not create signature row.',
    }
  }

  const upload = await uploadSignatureImageAsLandlord({
    ownerId: user.id,
    leaseId,
    signatureId: created.id,
    party: 'landlord',
    pngBytes: dataUrlToBytes(parsed.data.signature_data_url),
  })
  if (!upload.success) {
    // Clean up the orphan row
    await supabase
      .from('lease_signatures')
      .delete()
      .eq('id', created.id)
    return { success: false, message: upload.reason }
  }

  // Capture forensic context
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    null
  const ua = hdrs.get('user-agent') ?? null

  const nowIso = new Date().toISOString()
  await supabase
    .from('lease_signatures')
    .update({
      status: 'signed',
      typed_name: parsed.data.typed_name,
      signature_image_path: upload.storagePath,
      signature_drawn_at: nowIso,
      signed_at: nowIso,
      signed_ip: ip,
      signed_user_agent: ua,
    })
    .eq('id', created.id)

  await maybeStampLeaseSignedAt(supabase, leaseId)

  revalidatePath(`/dashboard/tenants`)
  return { success: true }
}

// ------------------------------------------------------------
// Tenant signs via token (public — no auth)
// ------------------------------------------------------------

export type PublicSignResult =
  | { success: true; redirectTo: string }
  | { success: false; message: string }
  | { success: false; errors: Record<string, string[]> }

export async function recordTenantSignature(
  token: string,
  _prev: PublicSignResult | { success: boolean },
  formData: FormData,
): Promise<PublicSignResult> {
  const parsed = RecordSignatureSchema.safeParse({
    typed_name: formData.get('typed_name'),
    signature_data_url: formData.get('signature_data_url'),
  })
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  if (!token || token.length < 16) {
    return { success: false, message: 'Invalid signing link.' }
  }

  const supabase = getServiceRoleClient()

  const { data: row } = await supabase
    .from('lease_signatures')
    .select('id, owner_id, lease_id, party, status, token_expires_at')
    .eq('sign_token', token)
    .eq('status', 'pending')
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig = row as any
  if (!sig) {
    return {
      success: false,
      message: 'This signing link is invalid or has already been used.',
    }
  }
  if (sig.party !== 'tenant') {
    return { success: false, message: 'Wrong party for this link.' }
  }
  if (
    sig.token_expires_at &&
    new Date(sig.token_expires_at).getTime() < Date.now()
  ) {
    return {
      success: false,
      message: 'This signing link has expired. Ask the landlord for a new one.',
    }
  }

  const upload = await uploadSignatureImagePublic({
    ownerId: sig.owner_id,
    leaseId: sig.lease_id,
    signatureId: sig.id,
    party: 'tenant',
    pngBytes: dataUrlToBytes(parsed.data.signature_data_url),
  })
  if (!upload.success) {
    return { success: false, message: upload.reason }
  }

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    null
  const ua = hdrs.get('user-agent') ?? null

  const nowIso = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('lease_signatures')
    .update({
      status: 'signed',
      typed_name: parsed.data.typed_name,
      signature_image_path: upload.storagePath,
      signature_drawn_at: nowIso,
      signed_at: nowIso,
      signed_ip: ip,
      signed_user_agent: ua,
      // Burn the token — even though status='signed' filters it out,
      // belt-and-suspenders.
      sign_token: null,
    })
    .eq('id', sig.id)

  if (updErr) return { success: false, message: updErr.message }

  await maybeStampLeaseSignedAt(supabase, sig.lease_id)

  return {
    success: true,
    redirectTo: `/lease-sign/${token}/done`,
  }
}

// Helper redirect after successful sign — keeps the tenant on a
// success page instead of bouncing back through a 404 token.
export async function goToSignedConfirmation(
  redirectTo: string,
): Promise<void> {
  redirect(redirectTo)
}
