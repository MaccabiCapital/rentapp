'use client'

import { useActionState } from 'react'
import { uploadProspectDocument } from '@/app/actions/screening'
import { emptyActionState } from '@/app/lib/types'
import {
  APPLICATION_DOCUMENT_KIND_VALUES,
  APPLICATION_DOCUMENT_KIND_LABELS,
} from '@/app/lib/schemas/screening'

export function ProspectDocumentUploadForm({
  prospectId,
}: {
  prospectId: string
}) {
  const action = uploadProspectDocument.bind(null, prospectId)
  const [state, formAction, isPending] = useActionState(
    action,
    emptyActionState,
  )
  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null
  const justSaved = state.success === true && !isPending

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-zinc-900">
        Upload a document
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Pay stub, bank statement, employer letter, ID, etc. PDF or image
        formats, up to 10 MB.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <label
            htmlFor="kind"
            className="block text-xs font-medium text-zinc-700"
          >
            Document type
          </label>
          <select
            id="kind"
            name="kind"
            required
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="" disabled>
              Pick…
            </option>
            {APPLICATION_DOCUMENT_KIND_VALUES.map((k) => (
              <option key={k} value={k}>
                {APPLICATION_DOCUMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          {errors.kind && (
            <p className="mt-1 text-xs text-red-600">{errors.kind[0]}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor="file"
            className="block text-xs font-medium text-zinc-700"
          >
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
          {errors.file && (
            <p className="mt-1 text-xs text-red-600">{errors.file[0]}</p>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {message}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        {justSaved ? (
          <span className="text-xs text-emerald-700">Uploaded.</span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  )
}
