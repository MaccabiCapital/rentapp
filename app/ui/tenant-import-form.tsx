'use client'

// ============================================================
// Tenant CSV import — client form
// ============================================================
//
// Paste CSV, preview client-side for immediate feedback, submit
// to server action for the authoritative parse + insert.

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { importTenantsFromCsv } from '@/app/actions/tenant-import'
import type { TenantImportResult } from '@/app/actions/tenant-import'
import { parseCsv, indexHeader, getCell } from '@/app/lib/csv'

const TEMPLATE_CSV = `first_name,last_name,email,phone,date_of_birth,emergency_contact_name,emergency_contact_phone,notes
Jane,Example,jane@example.com,555-0100,1992-05-12,John Example,555-0199,Preferred contact via text
John,Sample,john@sample.com,555-0101,,Mary Sample,555-0198,
`

const INITIAL_STATE: TenantImportResult = {
  success: true,
  imported: 0,
  skipped: [],
}

type PreviewRow = {
  rowIndex: number
  first_name: string | undefined
  last_name: string | undefined
  email: string | undefined
  phone: string | undefined
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
    return { rows: [], headerError: 'Need a header row + at least one data row.' }
  }
  const headers = indexHeader(parsed[0])
  if (!('first_name' in headers) || !('last_name' in headers)) {
    return {
      rows: [],
      headerError: 'Missing required columns: first_name, last_name.',
    }
  }
  const rows: PreviewRow[] = []
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    const firstName = getCell(row, headers, 'first_name')
    const lastName = getCell(row, headers, 'last_name')
    const email = getCell(row, headers, 'email')
    const phone = getCell(row, headers, 'phone')
    let valid = true
    let error: string | undefined
    if (!firstName || !lastName) {
      valid = false
      error = 'Missing first or last name'
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      valid = false
      error = `Invalid email: ${email}`
    }
    rows.push({
      rowIndex: i + 1,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      valid,
      error,
    })
  }
  return { rows }
}

export function TenantImportForm() {
  const [state, formAction, isPending] = useActionState<
    TenantImportResult,
    FormData
  >(importTenantsFromCsv, INITIAL_STATE)
  const [csvText, setCsvText] = useState('')

  const preview = buildPreview(csvText)
  const validCount = preview.rows.filter((r) => r.valid).length
  const invalidCount = preview.rows.filter((r) => !r.valid).length

  function handleLoadTemplate() {
    setCsvText(TEMPLATE_CSV)
  }

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
    a.download = 'rentapp-tenant-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <form action={formAction} className="space-y-6">
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
              onClick={handleLoadTemplate}
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
          placeholder="Paste CSV content here. Required columns: first_name, last_name. Optional: email, phone, date_of_birth (YYYY-MM-DD), emergency_contact_name, emergency_contact_phone, notes."
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
            Preview — {validCount} valid row
            {validCount === 1 ? '' : 's'}
            {invalidCount > 0 && (
              <span className="ml-1 text-red-700">
                · {invalidCount} invalid
              </span>
            )}
          </h2>
          <div className="max-h-96 overflow-auto rounded-md border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="sticky top-0 bg-zinc-50">
                <tr>
                  <Th>Row</Th>
                  <Th>First</Th>
                  <Th>Last</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
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
                    <Td>{r.first_name ?? '—'}</Td>
                    <Td>{r.last_name ?? '—'}</Td>
                    <Td>{r.email ?? '—'}</Td>
                    <Td>{r.phone ?? '—'}</Td>
                    <Td>
                      {r.valid ? (
                        <span className="text-emerald-700">OK</span>
                      ) : (
                        <span className="text-red-700">
                          {r.error}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Server action result */}
      {!state.success && 'message' in state && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {state.message}
        </div>
      )}
      {state.success && 'imported' in state && state.imported > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Imported {state.imported} tenant
          {state.imported === 1 ? '' : 's'}.
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
              : `Import ${validCount} tenant${validCount === 1 ? '' : 's'}`}
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
