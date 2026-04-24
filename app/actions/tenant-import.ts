'use server'

// ============================================================
// Tenant CSV import — bulk add tenants from pasted CSV
// ============================================================
//
// Workflow:
//   1. User pastes CSV into the import page.
//   2. Server action re-parses + validates each row (ignoring
//      the browser-side preview, don't trust client data).
//   3. Inserts valid rows in one batch under the authenticated
//      owner_id. Skipped rows are returned in the action state
//      so the user sees exactly what didn't land.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  parseCsv,
  indexHeader,
  getCell,
} from '@/app/lib/csv'

export type TenantImportResult =
  | {
      success: true
      imported: number
      skipped: Array<{ rowIndex: number; reason: string }>
    }
  | { success: false; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function importTenantsFromCsv(
  _prev: TenantImportResult | { success: boolean },
  formData: FormData,
): Promise<TenantImportResult> {
  const raw = formData.get('csv')
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {
      success: false,
      message: 'Paste some CSV content before importing.',
    }
  }

  const rows = parseCsv(raw)
  if (rows.length < 2) {
    return {
      success: false,
      message: 'CSV must have a header row and at least one data row.',
    }
  }

  const headerRow = rows[0]
  const headerIndex = indexHeader(headerRow)

  if (!('first_name' in headerIndex) || !('last_name' in headerIndex)) {
    return {
      success: false,
      message:
        'CSV must include at least "first_name" and "last_name" columns. Download the template for an example.',
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const toInsert: Array<{
    owner_id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    date_of_birth: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    notes: string | null
  }> = []
  const skipped: Array<{ rowIndex: number; reason: string }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const firstName = getCell(row, headerIndex, 'first_name')
    const lastName = getCell(row, headerIndex, 'last_name')

    if (!firstName || !lastName) {
      skipped.push({
        rowIndex: i + 1,
        reason: 'Missing first_name or last_name.',
      })
      continue
    }

    const email = getCell(row, headerIndex, 'email')
    if (email && !EMAIL_RE.test(email)) {
      skipped.push({
        rowIndex: i + 1,
        reason: `Invalid email format: ${email}`,
      })
      continue
    }

    const dob = getCell(row, headerIndex, 'date_of_birth')
    if (dob && !DATE_RE.test(dob)) {
      skipped.push({
        rowIndex: i + 1,
        reason: `Invalid date_of_birth format (need YYYY-MM-DD): ${dob}`,
      })
      continue
    }

    toInsert.push({
      owner_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: email ?? null,
      phone: getCell(row, headerIndex, 'phone') ?? null,
      date_of_birth: dob ?? null,
      emergency_contact_name:
        getCell(row, headerIndex, 'emergency_contact_name') ?? null,
      emergency_contact_phone:
        getCell(row, headerIndex, 'emergency_contact_phone') ?? null,
      notes: getCell(row, headerIndex, 'notes') ?? null,
    })
  }

  if (toInsert.length === 0) {
    return {
      success: true,
      imported: 0,
      skipped,
    }
  }

  const { error } = await supabase.from('tenants').insert(toInsert)
  if (error) {
    return {
      success: false,
      message: `Failed to import tenants: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/tenants')
  revalidatePath('/dashboard')
  return {
    success: true,
    imported: toInsert.length,
    skipped,
  }
}
