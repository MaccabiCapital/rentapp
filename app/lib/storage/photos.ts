// ============================================================
// Photo storage helpers
// ============================================================
//
// Paths follow the convention:
//   {owner_id}/units/{unit_id}/{photo_id}.{ext}
//   {owner_id}/maintenance/{request_id}/{photo_id}.{ext}
//   {owner_id}/properties/{property_id}/{photo_id}.{ext}
//
// The owner_id prefix is critical — it's what the Storage RLS
// policies check against auth.uid().

import { createServerClient } from '@/lib/supabase/server'

export type PhotoEntityType = 'units' | 'maintenance' | 'properties'

export const PHOTO_BUCKET = 'rentapp-photos'

// Build a storage path for a new photo upload. The photo_id is
// random so multiple uploads to the same entity don't collide.
export function buildPhotoPath(
  ownerId: string,
  entityType: PhotoEntityType,
  entityId: string,
  filename: string,
): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'webp'
  const photoId = crypto.randomUUID()
  return `${ownerId}/${entityType}/${entityId}/${photoId}.${ext}`
}

// Given a stored path, return a short-lived signed URL for display.
// Signed URLs expire in 1 hour — the rent-roll / detail pages
// re-generate them on every server render.
export async function getSignedPhotoUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

// Batch sign a list of paths. Returns a map from path → signed URL.
// Any unsignable paths (deleted / not owned / missing) are omitted.
export async function getSignedPhotoUrls(
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, expiresInSeconds)
  if (error || !data) return {}
  const result: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) {
      result[item.path] = item.signedUrl
    }
  }
  return result
}

// Determine if a path string is a Supabase-Storage-managed path
// (starts with a UUID/ownerId segment) vs an external URL
// (http/https). External URLs are used in the demo seed for
// Unsplash stock photos.
export function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

// Resolve a photo path into a display URL. External URLs pass
// through; Supabase paths get signed.
export async function resolvePhotoUrl(path: string): Promise<string | null> {
  if (isExternalUrl(path)) return path
  return getSignedPhotoUrl(path)
}

export async function resolvePhotoUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const externals: Record<string, string> = {}
  const toSign: string[] = []
  for (const p of paths) {
    if (isExternalUrl(p)) externals[p] = p
    else toSign.push(p)
  }
  const signed = await getSignedPhotoUrls(toSign)
  return { ...externals, ...signed }
}
