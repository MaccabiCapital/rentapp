'use client'

// ============================================================
// Listing copy generator — UI for the AI description writer
// ============================================================
//
// Reads the property/unit/rent fields from the surrounding
// listing form, sends them to the server action, then offers
// the generated copy. Landlord clicks "Use this" to paste it
// into the description textarea. Nothing is auto-saved — the
// human reviews and submits the listing form normally.

import { useState, useTransition } from 'react'
import {
  generateListingCopyAction,
  type GenerateListingCopyResult,
} from '@/app/actions/listings'

type Finding = {
  title: string
  severity: string
}

export function ListingCopyGenerator({
  descriptionTextareaId = 'description',
  propertyFieldName = 'property_id',
  unitFieldName = 'unit_id',
  rentFieldName = 'headline_rent',
  availableFieldName = 'available_on',
}: {
  descriptionTextareaId?: string
  propertyFieldName?: string
  unitFieldName?: string
  rentFieldName?: string
  availableFieldName?: string
}) {
  const [highlights, setHighlights] = useState('')
  const [proposed, setProposed] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onGenerate = () => {
    setError(null)
    const form = (
      document.getElementById(descriptionTextareaId)?.closest('form')
    ) as HTMLFormElement | null
    if (!form) {
      setError('Could not locate the listing form on this page.')
      return
    }

    const fd = new FormData()
    const get = (name: string) =>
      (form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null)?.value ?? ''
    fd.set('property_id', get(propertyFieldName))
    fd.set('unit_id', get(unitFieldName))
    fd.set('headline_rent', get(rentFieldName))
    fd.set('available_on', get(availableFieldName))
    fd.set('highlights', highlights)

    startTransition(async () => {
      const result: GenerateListingCopyResult =
        await generateListingCopyAction(fd)
      if (result.success === false) {
        setError(result.message)
        return
      }
      setProposed(result.result.description)
      setModel(result.result.model)
      setFindings(
        result.result.scanFindings.map((f) => ({
          title: f.title,
          severity: f.severity,
        })),
      )
    })
  }

  const onUseThis = () => {
    if (!proposed) return
    const ta = document.getElementById(
      descriptionTextareaId,
    ) as HTMLTextAreaElement | null
    if (!ta) return
    ta.value = proposed
    // Fire input event so React-controlled textareas update.
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.focus()
    setProposed(null)
  }

  const isLive = model && model !== 'stub'
  const reds = findings.filter((f) => f.severity === 'red')
  const ambers = findings.filter((f) => f.severity === 'amber')

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            AI description writer
          </div>
          <div className="text-xs text-zinc-600">
            Generates fair-housing-safe copy from your property facts.
            You review before saving.
          </div>
        </div>
        {model && (
          <span
            className={
              isLive
                ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                : 'inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700'
            }
          >
            {isLive ? `Live · ${model}` : 'Live AI not configured'}
          </span>
        )}
      </div>

      <div className="mt-3">
        <label
          htmlFor="listing_highlights"
          className="block text-xs font-medium text-zinc-700"
        >
          Highlights to include (optional)
        </label>
        <input
          id="listing_highlights"
          type="text"
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="e.g. near the T, in-unit laundry, recently renovated"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          The generator will weave these in. Don&apos;t mention tenant
          types — describe the unit, not the renter.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending ? 'Generating…' : 'Generate description'}
        </button>
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      {proposed && (
        <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Proposed copy
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-900">
            {proposed}
          </p>

          {(reds.length > 0 || ambers.length > 0) && (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <div className="font-semibold">
                Fair-housing scan flagged {reds.length} red /{' '}
                {ambers.length} amber finding
                {findings.length === 1 ? '' : 's'}.
              </div>
              <ul className="mt-1 list-disc pl-4">
                {findings.slice(0, 4).map((f, i) => (
                  <li key={i}>
                    [{f.severity}] {f.title}
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                Review and edit before saving.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setProposed(null)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={onUseThis}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Use this
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
