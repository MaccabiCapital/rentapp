'use client'

// ============================================================
// PhotoUploader — drag-drop + click-to-upload with client resize
// ============================================================
//
// Resizes each photo to max 1600px wide on the canvas API
// before uploading. Converts to WebP at 85% quality. This
// cuts typical iPhone photos from 5MB → 300KB and respects
// the 10MB Storage cap with tons of headroom.
//
// The component lives next to a <PhotoGallery> — it only
// handles upload. Delete happens on individual photo cards.

import { useState, useTransition } from 'react'
import { uploadPhoto } from '@/app/actions/photos'
import type { PhotoEntityType } from '@/app/lib/storage/photos'

const MAX_WIDTH = 1600
const WEBP_QUALITY = 0.85

async function resizeToWebp(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / imageBitmap.width)
  const width = Math.round(imageBitmap.width * scale)
  const height = Math.round(imageBitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable.')
  ctx.drawImage(imageBitmap, 0, 0, width, height)
  imageBitmap.close()

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY)
  })
  if (!blob) throw new Error('Failed to encode WebP.')

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

export function PhotoUploader({
  entityType,
  entityId,
}: {
  entityType: PhotoEntityType
  entityId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [progress, setProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) {
      setError('Drop or pick image files only.')
      return
    }
    setError(null)

    startTransition(async () => {
      for (let i = 0; i < list.length; i++) {
        setProgress({ current: i + 1, total: list.length })
        try {
          const resized = await resizeToWebp(list[i])
          const fd = new FormData()
          fd.append('photo', resized)
          const result = await uploadPhoto(entityType, entityId, fd)
          if (result && !result.success && 'message' in result) {
            setError(result.message)
            setProgress(null)
            return
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? `Failed to process photo: ${err.message}`
              : 'Failed to process photo.',
          )
          setProgress(null)
          return
        }
      }
      setProgress(null)
    })
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Reset so the same file can be re-uploaded
      e.target.value = ''
    }
  }

  const inputId = `photo-upload-${entityType}-${entityId}`

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : isPending
              ? 'border-zinc-300 bg-zinc-50 cursor-wait'
              : 'border-zinc-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/*"
          multiple
          className="sr-only"
          onChange={handleInputChange}
          disabled={isPending}
        />
        <svg
          className="mx-auto h-10 w-10 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        {isPending ? (
          <p className="mt-2 text-sm text-zinc-600">
            Uploading {progress?.current} of {progress?.total}…
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-medium text-zinc-700">
              Drop photos here or click to choose
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              JPEG, PNG, WebP, HEIC · Max 10MB · Auto-resized to 1600px
            </p>
          </>
        )}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
