'use client'

import { useActionState, useState, useTransition } from 'react'
import {
  uploadCompanyLogo,
  removeCompanyLogo,
} from '@/app/actions/company-profile'
import { emptyActionState } from '@/app/lib/types'

export function CompanyLogoUploader({
  existingUrl,
  hasLogo,
}: {
  existingUrl: string | null
  hasLogo: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    uploadCompanyLogo,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  const [removeError, setRemoveError] = useState<string | null>(null)
  const [isRemoving, startRemove] = useTransition()

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Logo</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Used on PDF headers and the public application page (when wired).
        PNG, JPG, WebP, or SVG. Max 2 MB.
      </p>

      <div className="mt-4 flex items-center gap-4">
        {existingUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={existingUrl}
            alt="Company logo"
            className="h-16 w-16 rounded-md border border-zinc-200 object-contain bg-zinc-50"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-400">
            No logo
          </div>
        )}

        <div className="flex-1">
          <form action={formAction} className="flex items-center gap-2">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              required
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? 'Uploading…' : 'Upload'}
            </button>
          </form>
          {(errors.logo || message) && (
            <p className="mt-1 text-xs text-red-600">
              {errors.logo?.[0] ?? message}
            </p>
          )}

          {hasLogo && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Remove the current logo?')) return
                setRemoveError(null)
                startRemove(async () => {
                  const result = await removeCompanyLogo()
                  if (result.success === false && 'message' in result) {
                    setRemoveError(result.message ?? 'Remove failed.')
                  }
                })
              }}
              disabled={isRemoving}
              className="mt-2 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {isRemoving ? 'Removing…' : 'Remove logo'}
            </button>
          )}
          {removeError && (
            <p className="mt-1 text-xs text-red-600">{removeError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
