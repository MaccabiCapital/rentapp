'use server'

// ============================================================
// Property CSV import — bulk add properties from pasted CSV
// ============================================================

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  parseCsv,
  indexHeader,
  getCell,
} from '@/app/lib/csv'

export type PropertyImportResult =
  | {
      success: true
      imported: number
      skipped: Array<{ rowIndex: number; reason: string }>
    }
  | { success: false; message: string }

export async function importPropertiesFromCsv(
  _prev: PropertyImportResult | { success: boolean },
  formData: FormData,
): Promise<PropertyImportResult> {
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

  const header = rows[0]
  const headerIndex = indexHeader(header)
  const required = ['name', 'street_address', 'city', 'state', 'postal_code']
  for (const col of required) {
    if (!(col in headerIndex)) {
      return {
        success: false,
        message: `CSV must include a "${col}" column. Download the template for an example.`,
      }
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
    name: string
    street_address: string
    city: string
    state: string
    postal_code: string
    country: string
    property_type: string | null
    year_built: number | null
    notes: string | null
  }> = []
  const skipped: Array<{ rowIndex: number; reason: string }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = getCell(row, headerIndex, 'name')
    const street = getCell(row, headerIndex, 'street_address')
    const city = getCell(row, headerIndex, 'city')
    const state = getCell(row, headerIndex, 'state')
    const postal = getCell(row, headerIndex, 'postal_code')

    if (!name || !street || !city || !state || !postal) {
      skipped.push({
        rowIndex: i + 1,
        reason: 'Missing a required field (name, street_address, city, state, postal_code).',
      })
      continue
    }

    const stateNorm = state.trim().toUpperCase()
    if (stateNorm.length !== 2) {
      skipped.push({
        rowIndex: i + 1,
        reason: `State must be the 2-letter USPS code (got: ${state})`,
      })
      continue
    }

    const yearBuiltStr = getCell(row, headerIndex, 'year_built')
    let yearBuilt: number | null = null
    if (yearBuiltStr) {
      const y = Number(yearBuiltStr)
      if (!Number.isInteger(y) || y < 1600 || y > 2100) {
        skipped.push({
          rowIndex: i + 1,
          reason: `Invalid year_built: ${yearBuiltStr}`,
        })
        continue
      }
      yearBuilt = y
    }

    toInsert.push({
      owner_id: user.id,
      name,
      street_address: street,
      city,
      state: stateNorm,
      postal_code: postal,
      country: getCell(row, headerIndex, 'country') ?? 'US',
      property_type: getCell(row, headerIndex, 'property_type') ?? null,
      year_built: yearBuilt,
      notes: getCell(row, headerIndex, 'notes') ?? null,
    })
  }

  if (toInsert.length === 0) {
    return { success: true, imported: 0, skipped }
  }

  const { error } = await supabase.from('properties').insert(toInsert)
  if (error) {
    return {
      success: false,
      message: `Failed to import properties: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard')
  return { success: true, imported: toInsert.length, skipped }
}
