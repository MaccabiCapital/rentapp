// ============================================================
// Landlord branding storage (logos)
// ============================================================
//
// Bucket: 'landlord-branding' (private). Path scheme:
//   {ownerId}/logo.{ext}
//
// One logo per landlord. Re-upload overwrites the existing file.

import { createServerClient } from '@/lib/supabase/server'

export const LANDLORD_BRANDING_BUCKET = 'landlord-branding'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/svg+xml') return 'svg'
  return 'png'
}

export type LogoUploadResult =
  | { success: true; storagePath: string }
  | { success: false; reason: string }

export async function uploadLandlordLogo(opts: {
  ownerId: string
  file: File
}): Promise<LogoUploadResult> {
  if (opts.file.size === 0) {
    return { success: false, reason: 'File is empty.' }
  }
  if (opts.file.size > MAX_BYTES) {
    return {
      success: false,
      reason: `Logo exceeds 2 MB (file is ${Math.round(opts.file.size / 1024)} KB).`,
    }
  }
  if (opts.file.type && !ALLOWED_MIME.has(opts.file.type)) {
    return {
      success: false,
      reason: `Unsupported logo type: ${opts.file.type}. Use PNG, JPG, WebP, or SVG.`,
    }
  }

  const supabase = await createServerClient()
  const ext = extFromFile(opts.file)
  const storagePath = `${opts.ownerId}/logo.${ext}`

  const arrayBuffer = await opts.file.arrayBuffer()
  const { error } = await supabase.storage
    .from(LANDLORD_BRANDING_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: opts.file.type || 'application/octet-stream',
      upsert: true,
    })

  if (error) {
    return { success: false, reason: error.message }
  }

  return { success: true, storagePath }
}

export async function getSignedLogoUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(LANDLORD_BRANDING_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteLandlordLogo(storagePath: string): Promise<void> {
  const supabase = await createServerClient()
  await supabase.storage
    .from(LANDLORD_BRANDING_BUCKET)
    .remove([storagePath])
}
