'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { importLeasesFromCsv } from '@/app/actions/lease-import'
import type { LeaseImportResult } from '@/app/actions/lease-import'
import { parseCsv, indexHeader, getCell } from '@/app/lib/csv'

const TEMPLATE_CSV = `tenant_email,property_name,unit_number,start_date,end_date,monthly_rent,security_deposit,rent_due_day,late_fee_amount,late_fee_grace_days,status,notes
jane@example.com,My Duplex,1A,2026-01-01,2026-12-31,2100.00,4200.00,1,50.00,5,active,First-year lease
john@example.com,My Duplex,1B,2026-02-01,2027-01-31,2050.00,4100.00,1,50.00,5,active,
`

const INITIAL_STATE: LeaseImportResult = {
  success: true,
  imported: 0,
  skipped: [],
}

type PreviewRow = {
  rowIndex: number
  email: string | undefined
  property: string | undefined
  unit: string | undefined
  start: string | undefined
  end: string | undefined
  rent: string | undefined
  valid: boolean
  error?: string
}

function buildPreview(raw: string): {
  rows: PreviewRow[]
  headerError?: string
} {
  if (raw.trim() === '') return { rows: [] }
  const parsed = parseCsv(raw)
  if (parsed.length < 2) {
    return {
      rows: [],
      headerError: 'Need a header row + at least one data row.',
    }
  }
  const headers = indexHeader(parsed[0])
  const required = [
    'tenant_email',
    'property_name',
    'unit_number',
    'start_date',
    'end_date',
    'monthly_rent',
  ]
  for (const col of required) {
    if (!(col in headers)) {
      return { rows: [], headerError: `Missing required column: ${col}` }
    }
  }
  const rows: PreviewRow[] = []
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    const email = getCell(row, headers, 'tenant_email')
    const property = getCell(row, headers, 'property_name')
    const unit = getCell(row, headers, 'unit_number')
    const start = getCell(row, headers, 'start_date')
    const end = getCell(row, headers, 'end_date')
    const rent = getCell(row, headers, 'monthly_rent')
    let valid = true
    let error: string | undefined
    if (!email || !property || !start || !end || !rent) {
      valid = false
      error = 'Missing required field'
    } else if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end)
    ) {
      valid = false
      error = 'Dates must be YYYY-MM-DD'
    } else if (!Number.isFinite(Number(rent)) || Number(rent) <= 0) {
      valid = false
      error = `Invalid monthly_rent: ${rent}`
    }
    rows.push({
      rowIndex: i + 1,
      email,
      property,
      unit,
      start,
      end,
      rent,
      valid,
      error,
    })
  }
  return { rows }
}

export function LeaseImportForm() {
  const [state, formAction, isPending] = useActionState<
    LeaseImportResult,
    FormData
  >(importLeasesFromCsv, INITIAL_STATE)
  const [csvText, setCsvText] = useState('')

  const preview = buildPreview(csvText)
  const validCount = preview.rows.filter((r) => r.valid).length
  const invalidCount = preview.rows.filter((r) => !r.valid).length

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
  }

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rentapp-lease-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="font-semibold">Import tenants + properties first</div>
        <p className="mt-1 text-amber-800">
          Leases reference existing tenants (by email) and units (by property
          name + unit_number). Both must already exist — we won&rsquo;t
          auto-create them. Import tenants and properties first, then come
          back here.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            Paste or upload CSV
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Download template
            </button>
            <button
              type="button"
              onClick={() => setCsvText(TEMPLATE_CSV)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Load sample
            </button>
          </div>
        </div>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="mb-3 block w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-900"
        />

        <textarea
          name="csv"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          placeholder="Paste CSV. Required: tenant_email, property_name, unit_number (may be blank for single-family), start_date, end_date, monthly_rent. Optional: security_deposit, rent_due_day, late_fee_amount, late_fee_grace_days, status (default active), notes."
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {preview.headerError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {preview.headerError}
        </div>
      )}

      {preview.rows.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Preview — {validCount} valid
            {invalidCount > 0 && (
              <span className="ml-1 text-red-700">· {invalidCount} invalid</span>
            )}
          </h2>
          <p className="mb-2 text-xs text-zinc-500">
            Note: tenant + unit existence is verified server-side on import.
            Rows that look valid here may still be rejected if the tenant
            email or unit isn&rsquo;t found.
          </p>
          <div className="max-h-96 overflow-auto rounded-md border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="sticky top-0 bg-zinc-50">
                <tr>
                  <Th>Row</Th>
                  <Th>Tenant email</Th>
                  <Th>Property · unit</Th>
                  <Th>Dates</Th>
                  <Th>Rent</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {preview.rows.map((r) => (
                  <tr
                    key={r.rowIndex}
                    className={r.valid ? '' : 'bg-red-50/60'}
                  >
                    <Td>{r.rowIndex}</Td>
                    <Td>{r.email ?? '—'}</Td>
                    <Td>
                      {r.property ?? '—'}
                      {r.unit ? ` · ${r.unit}` : ''}
                    </Td>
                    <Td>
                      {r.start ?? '—'} → {r.end ?? '—'}
                    </Td>
                    <Td>${r.rent ?? '—'}</Td>
                    <Td>
                      {r.valid ? (
                        <span className="text-emerald-700">Looks OK</span>
                      ) : (
                        <span className="text-red-700">{r.error}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!state.success && 'message' in state && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {state.message}
        </div>
      )}
      {state.success && 'imported' in state && state.imported > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Imported {state.imported} lease{state.imported === 1 ? '' : 's'}.
          {state.skipped.length > 0 && (
            <> Skipped {state.skipped.length} invalid row
              {state.skipped.length === 1 ? '' : 's'}.</>
          )}
        </div>
      )}
      {state.success &&
        'imported' in state &&
        state.skipped.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="font-semibold">Skipped rows:</div>
            <ul className="mt-1 space-y-0.5">
              {state.skipped.map((s, i) => (
                <li key={i}>
                  Row {s.rowIndex}: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/tenants"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || validCount === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {isPending
            ? 'Importing…'
            : validCount === 0
              ? 'Nothing to import'
              : `Import ${validCount} lease${validCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </form>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-2 py-1.5 align-top text-xs text-zinc-900">{children}</td>
  )
}
