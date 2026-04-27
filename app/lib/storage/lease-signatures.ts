// ============================================================
// Lease signature image storage
// ============================================================
//
// Bucket: 'lease-signatures' (private, signed URLs only).
// Path scheme:
//   {owner_id}/{lease_id}/{party}-{signature_id}.png

import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export const LEASE_SIGNATURES_BUCKET = 'lease-signatures'

const MAX_BYTES = 200_000 // 200 KB

export type SignatureUploadResult =
  | { success: true; storagePath: string }
  | { success: false; reason: string }

// Tenant signing flow runs without auth — service-role write.
export async function uploadSignatureImagePublic(opts: {
  ownerId: string
  leaseId: string
  signatureId: string
  party: 'tenant' | 'landlord'
  pngBytes: Uint8Array
}): Promise<SignatureUploadResult> {
  if (opts.pngBytes.byteLength === 0) {
    return { success: false, reason: 'Signature image is empty.' }
  }
  if (opts.pngBytes.byteLength > MAX_BYTES) {
    return { success: false, reason: 'Signature image is too large.' }
  }

  const supabase = getServiceRoleClient()
  const storagePath = `${opts.ownerId}/${opts.leaseId}/${opts.party}-${opts.signatureId}.png`

  const { error } = await supabase.storage
    .from(LEASE_SIGNATURES_BUCKET)
    .upload(storagePath, opts.pngBytes, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) return { success: false, reason: error.message }
  return { success: true, storagePath }
}

// Landlord signing flow uses authenticated session client.
export async function uploadSignatureImageAsLandlord(opts: {
  ownerId: string
  leaseId: string
  signatureId: string
  party: 'tenant' | 'landlord'
  pngBytes: Uint8Array
}): Promise<SignatureUploadResult> {
  if (opts.pngBytes.byteLength === 0) {
    return { success: false, reason: 'Signature image is empty.' }
  }
  if (opts.pngBytes.byteLength > MAX_BYTES) {
    return { success: false, reason: 'Signature image is too large.' }
  }

  const supabase = await createServerClient()
  const storagePath = `${opts.ownerId}/${opts.leaseId}/${opts.party}-${opts.signatureId}.png`

  const { error } = await supabase.storage
    .from(LEASE_SIGNATURES_BUCKET)
    .upload(storagePath, opts.pngBytes, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) return { success: false, reason: error.message }
  return { success: true, storagePath }
}

export async function getSignedSignatureUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(LEASE_SIGNATURES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

// Convert "data:image/png;base64,XXXX" to bytes.
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',', 2)[1] ?? ''
  // Buffer.from is available in Node runtime (Next server actions).
  return new Uint8Array(Buffer.from(base64, 'base64'))
}
