'use client'

// ============================================================
// PhotoGalleryClient — client-side grid + lightbox + delete
// ============================================================
//
// Receives already-signed URLs from the server component.
// Handles lightbox open/close, delete confirmation, and next/
// prev navigation. Deliberately no external dep — native
// <dialog> + keyboard handlers.

import { useState, useTransition, useEffect } from 'react'
import { deletePhoto } from '@/app/actions/photos'
import type { PhotoEntityType } from '@/app/lib/storage/photos'

type PhotoItem = {
  path: string
  url: string
}

export function PhotoGalleryClient({
  entityType,
  entityId,
  photos,
  allowDelete,
}: {
  entityType: PhotoEntityType
  entityId: string
  photos: PhotoItem[]
  allowDelete: boolean
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const lightboxPhoto =
    lightboxIndex !== null ? photos[lightboxIndex] : null

  // Keyboard navigation for the lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    function onKeyDown(e: KeyboardEvent) {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1)
      } else if (
        e.key === 'ArrowRight' &&
        lightboxIndex < photos.length - 1
      ) {
        setLightboxIndex(lightboxIndex + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxIndex, photos.length])

  function handleDelete(path: string) {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setError(null)
    startTransition(async () => {
      const result = await deletePhoto(entityType, entityId, path)
      if (result && !result.success && 'message' in result) {
        setError(result.message)
      }
      setLightboxIndex(null)
    })
  }

  return (
    <>
      {error && (
        <p className="mb-2 text-sm text-red-600">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, idx) => (
          <div
            key={photo.path}
            className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
              onClick={() => setLightboxIndex(idx)}
              loading="lazy"
            />
            {allowDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo.path)
                }}
                disabled={isPending}
                className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-zinc-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed"
                aria-label="Delete photo"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.url}
              alt=""
              className="max-h-[90vh] max-w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-2 top-2 rounded-md bg-white/90 p-2 text-zinc-700 hover:bg-white"
              aria-label="Close lightbox"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {lightboxIndex !== null && lightboxIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex(lightboxIndex - 1)
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-zinc-700 hover:bg-white"
                aria-label="Previous photo"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            {lightboxIndex !== null && lightboxIndex < photos.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex(lightboxIndex + 1)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-zinc-700 hover:bg-white"
                aria-label="Next photo"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
