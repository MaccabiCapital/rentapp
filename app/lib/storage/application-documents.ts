// ============================================================
// Application document storage helpers
// ============================================================
//
// Bucket: 'application-documents' (private). Path scheme matches
// the photos convention but replaces entity_id with the prospect
// or pre-prospect token:
//
//   {owner_id}/{prospect_id or token}/{kind}/{uuid}.{ext}
//
// Uploads from the public application page run under the service-
// role client (visitor isn't authenticated). Reads from the
// dashboard run under the landlord's session client.

import { createServerClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role'
import type { ApplicationDocumentKind } from '@/app/lib/schemas/screening'

export const APPLICATION_DOCUMENTS_BUCKET = 'application-documents'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB per file
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/heic') return 'heic'
  return 'bin'
}

export type UploadResult =
  | { success: true; storagePath: string; byteSize: number; mimeType: string }
  | { success: false; reason: string }

// ------------------------------------------------------------
// Public-application upload (uses service role)
// ------------------------------------------------------------

export async function uploadApplicationDocumentPublic(opts: {
  ownerId: string
  prospectId: string
  kind: ApplicationDocumentKind
  file: File
}): Promise<UploadResult> {
  if (opts.file.size === 0) {
    return { success: false, reason: 'File is empty.' }
  }
  if (opts.file.size > MAX_BYTES) {
    return { success: false, reason: 'File exceeds 10 MB.' }
  }
  if (opts.file.type && !ALLOWED_MIME.has(opts.file.type)) {
    return {
      success: false,
      reason: `Unsupported file type: ${opts.file.type}. Use PDF or image.`,
    }
  }

  const supabase = getServiceRoleClient()
  const ext = extFromFile(opts.file)
  const documentId = crypto.randomUUID()
  const storagePath = `${opts.ownerId}/${opts.prospectId}/${opts.kind}/${documentId}.${ext}`

  const arrayBuffer = await opts.file.arrayBuffer()
  const { error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: opts.file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) {
    return { success: false, reason: error.message }
  }

  return {
    success: true,
    storagePath,
    byteSize: opts.file.size,
    mimeType: opts.file.type || 'application/octet-stream',
  }
}

// ------------------------------------------------------------
// Landlord-side upload (authenticated session client)
// ------------------------------------------------------------

export async function uploadApplicationDocumentAsLandlord(opts: {
  ownerId: string
  prospectId: string
  kind: ApplicationDocumentKind
  file: File
}): Promise<UploadResult> {
  if (opts.file.size === 0) {
    return { success: false, reason: 'File is empty.' }
  }
  if (opts.file.size > MAX_BYTES) {
    return { success: false, reason: 'File exceeds 10 MB.' }
  }
  if (opts.file.type && !ALLOWED_MIME.has(opts.file.type)) {
    return {
      success: false,
      reason: `Unsupported file type: ${opts.file.type}. Use PDF or image.`,
    }
  }

  const supabase = await createServerClient()
  const ext = extFromFile(opts.file)
  const documentId = crypto.randomUUID()
  const storagePath = `${opts.ownerId}/${opts.prospectId}/${opts.kind}/${documentId}.${ext}`

  const arrayBuffer = await opts.file.arrayBuffer()
  const { error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: opts.file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) {
    return { success: false, reason: error.message }
  }

  return {
    success: true,
    storagePath,
    byteSize: opts.file.size,
    mimeType: opts.file.type || 'application/octet-stream',
  }
}

// ------------------------------------------------------------
// Read helpers (landlord-side only — RLS enforces ownership)
// ------------------------------------------------------------

export async function getSignedUrlForDocument(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteStoredDocument(
  storagePath: string,
): Promise<void> {
  const supabase = await createServerClient()
  await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .remove([storagePath])
}

// ------------------------------------------------------------
// Download bytes (server-side only — used by the forensics engine)
// ------------------------------------------------------------

export async function downloadDocumentBytes(
  storagePath: string,
): Promise<Uint8Array | null> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .download(storagePath)
  if (error || !data) return null
  const ab = await data.arrayBuffer()
  return new Uint8Array(ab)
}
