// ============================================================
// PhotoGallery — server component that resolves signed URLs
// and renders a grid of photos with per-photo delete buttons
// ============================================================
//
// Wraps a list of paths (from an entity's photos[] column),
// resolves each to a display URL (signed for internal paths,
// pass-through for external Unsplash URLs), and renders a
// responsive grid. Each photo gets a delete button wired
// through a client component.

import { resolvePhotoUrls } from '@/app/lib/storage/photos'
import type { PhotoEntityType } from '@/app/lib/storage/photos'
import { PhotoGalleryClient } from './photo-gallery-client'

export async function PhotoGallery({
  entityType,
  entityId,
  photos,
  allowDelete = true,
  emptyMessage = 'No photos yet.',
}: {
  entityType: PhotoEntityType
  entityId: string
  photos: string[]
  allowDelete?: boolean
  emptyMessage?: string
}) {
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    )
  }

  const urlMap = await resolvePhotoUrls(photos)
  const resolved = photos
    .map((path) => ({ path, url: urlMap[path] }))
    .filter((p): p is { path: string; url: string } => Boolean(p.url))

  if (resolved.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center text-sm text-amber-800">
        Photos are attached but could not be loaded. This usually means they
        were deleted outside the app or the signed URLs expired.
      </div>
    )
  }

  return (
    <PhotoGalleryClient
      entityType={entityType}
      entityId={entityId}
      photos={resolved}
      allowDelete={allowDelete}
    />
  )
}
