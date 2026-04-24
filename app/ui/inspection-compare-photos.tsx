// ============================================================
// Side-by-side photo strip for a single inspection-compare row
// ============================================================
//
// Small server component that resolves storage paths to signed
// URLs and renders a thin grid. No delete affordances — this
// view is strictly read-only.

import { resolvePhotoUrls } from '@/app/lib/storage/photos'

export async function InspectionComparePhotos({
  moveInPhotos,
  moveOutPhotos,
}: {
  moveInPhotos: string[]
  moveOutPhotos: string[]
}) {
  if (moveInPhotos.length === 0 && moveOutPhotos.length === 0) {
    return null
  }

  const allPaths = [...moveInPhotos, ...moveOutPhotos]
  const urlMap = await resolvePhotoUrls(allPaths)

  const inUrls = moveInPhotos
    .map((p) => urlMap[p])
    .filter((u): u is string => !!u)
  const outUrls = moveOutPhotos
    .map((p) => urlMap[p])
    .filter((u): u is string => !!u)

  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Move-in
        </div>
        {inUrls.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/40 p-3 text-center text-xs text-zinc-500">
            No photos
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {inUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt="Move-in photo"
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Move-out
        </div>
        {outUrls.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/40 p-3 text-center text-xs text-zinc-500">
            No photos
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {outUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt="Move-out photo"
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
