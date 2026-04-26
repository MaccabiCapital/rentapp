'use client'

// ============================================================
// Listing copy scanner UI
// ============================================================
//
// Paste-and-scan form. Pick a jurisdiction, paste copy, click
// scan. Findings persist to compliance_findings — visible in the
// findings inbox (and surfaced on this page after the scan).

import { useActionState, useState } from 'react'
import { scanListingCopy, type ScanListingResult } from '@/app/actions/compliance'
import { SUPPORTED_JURISDICTIONS } from '@/app/lib/compliance/rules'

const INITIAL: ScanListingResult = {
  success: false,
  message: '',
}

const JURISDICTION_OPTIONS: Array<{ code: string; name: string }> = [
  { code: 'US', name: 'Federal only (US)' },
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'MI', name: 'Michigan' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'WA', name: 'Washington' },
].filter((o) => SUPPORTED_JURISDICTIONS.includes(o.code))

export function ListingCopyScanner() {
  const [state, formAction, isPending] = useActionState<
    ScanListingResult,
    FormData
  >(scanListingCopy, INITIAL)

  const [copy, setCopy] = useState('')
  const [jurisdiction, setJurisdiction] = useState('US')

  const errors =
    state.success === false && 'errors' in state ? state.errors : {}
  const message =
    state.success === false && 'message' in state ? state.message : null

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">
        Scan listing copy
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Paste your listing description and pick the property&rsquo;s
        jurisdiction. The deterministic rule pack flags fair-housing
        violations with the exact phrase and a suggested rewrite.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="jurisdiction"
              className="block text-xs font-medium text-zinc-700"
            >
              Jurisdiction
            </label>
            <select
              id="jurisdiction"
              name="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {JURISDICTION_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
            {errors.jurisdiction && (
              <p className="mt-1 text-xs text-red-600">
                {errors.jurisdiction[0]}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="copy"
            className="block text-xs font-medium text-zinc-700"
          >
            Listing copy
          </label>
          <textarea
            id="copy"
            name="copy"
            rows={10}
            required
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            placeholder="Paste your listing description here. Try lines like 'perfect for young professionals', 'no Section 8', or 'two blocks from St. Mary's church' to see findings."
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.copy && (
            <p className="mt-1 text-xs text-red-600">{errors.copy[0]}</p>
          )}
        </div>

        {message && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {message}
          </p>
        )}

        {state.success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <strong>Scan complete.</strong> Evaluated{' '}
            {state.rulesEvaluated} rule{state.rulesEvaluated === 1 ? '' : 's'}{' '}
            against {state.jurisdiction}. {state.findingsPersisted} finding
            {state.findingsPersisted === 1 ? '' : 's'} added to the inbox
            below.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || copy.trim().length === 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isPending ? 'Scanning…' : 'Scan listing'}
          </button>
        </div>
      </form>
    </div>
  )
}
