'use server'

// ============================================================
// Lease CSV import — bulk add leases from pasted CSV
// ============================================================
//
// Each row references a tenant (by email, the most unique signal)
// and a unit (by property name + unit number). Both must already
// exist — we don't auto-create. Ambiguous or missing matches get
// rejected with a clear reason.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  parseCsv,
  indexHeader,
  getCell,
} from '@/app/lib/csv'

export type LeaseImportResult =
  | {
      success: true
      imported: number
      skipped: Array<{ rowIndex: number; reason: string }>
    }
  | { success: false; message: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const LEASE_STATUSES = [
  'draft',
  'active',
  'expired',
  'terminated',
  'renewed',
]

export async function importLeasesFromCsv(
  _prev: LeaseImportResult | { success: boolean },
  formData: FormData,
): Promise<LeaseImportResult> {
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
  const required = [
    'tenant_email',
    'property_name',
    'unit_number',
    'start_date',
    'end_date',
    'monthly_rent',
  ]
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

  // Load all tenants by email and all units by property+unit_number
  // in one query each to avoid N+1.
  const [tenantsRes, propsRes] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, email')
      .eq('owner_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('properties')
      .select(
        `id, name, units ( id, unit_number, deleted_at )`,
      )
      .eq('owner_id', user.id)
      .is('deleted_at', null),
  ])
  if (tenantsRes.error) {
    return {
      success: false,
      message: `Failed to load tenants: ${tenantsRes.error.message}`,
    }
  }
  if (propsRes.error) {
    return {
      success: false,
      message: `Failed to load properties: ${propsRes.error.message}`,
    }
  }

  const tenantByEmail = new Map<string, string>()
  for (const rawT of tenantsRes.data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = rawT as any
    if (t.email) tenantByEmail.set(String(t.email).toLowerCase(), t.id)
  }

  const unitByKey = new Map<string, string>() // key: `${propName}|${unitNumber}`
  for (const rawP of propsRes.data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = rawP as any
    const propName = String(p.name).trim().toLowerCase()
    for (const rawU of p.units ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = rawU as any
      if (u.deleted_at) continue
      const unitNumber = u.unit_number
        ? String(u.unit_number).trim().toLowerCase()
        : ''
      unitByKey.set(`${propName}|${unitNumber}`, u.id)
    }
  }

  const toInsert: Array<{
    owner_id: string
    tenant_id: string
    unit_id: string
    status: string
    start_date: string
    end_date: string
    monthly_rent: number
    security_deposit: number | null
    rent_due_day: number
    late_fee_amount: number | null
    late_fee_grace_days: number | null
    notes: string | null
  }> = []
  const skipped: Array<{ rowIndex: number; reason: string }> = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const tenantEmail = getCell(row, headerIndex, 'tenant_email')
    const propName = getCell(row, headerIndex, 'property_name')
    const unitNumberRaw = getCell(row, headerIndex, 'unit_number')
    const startDate = getCell(row, headerIndex, 'start_date')
    const endDate = getCell(row, headerIndex, 'end_date')
    const monthlyRentStr = getCell(row, headerIndex, 'monthly_rent')

    if (
      !tenantEmail ||
      !propName ||
      !startDate ||
      !endDate ||
      !monthlyRentStr
    ) {
      skipped.push({
        rowIndex: i + 1,
        reason:
          'Missing a required field (tenant_email, property_name, start_date, end_date, monthly_rent).',
      })
      continue
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      skipped.push({
        rowIndex: i + 1,
        reason: 'Dates must be YYYY-MM-DD.',
      })
      continue
    }
    const monthlyRent = Number(monthlyRentStr)
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      skipped.push({
        rowIndex: i + 1,
        reason: `Invalid monthly_rent: ${monthlyRentStr}`,
      })
      continue
    }

    const tenantId = tenantByEmail.get(tenantEmail.toLowerCase())
    if (!tenantId) {
      skipped.push({
        rowIndex: i + 1,
        reason: `No tenant found with email: ${tenantEmail}. Import tenants first.`,
      })
      continue
    }

    const unitKey = `${propName.trim().toLowerCase()}|${unitNumberRaw ? unitNumberRaw.trim().toLowerCase() : ''}`
    const unitId = unitByKey.get(unitKey)
    if (!unitId) {
      skipped.push({
        rowIndex: i + 1,
        reason: `No unit found: "${propName}"${unitNumberRaw ? ` · ${unitNumberRaw}` : ''}. Check property name and unit_number.`,
      })
      continue
    }

    const depositStr = getCell(row, headerIndex, 'security_deposit')
    let deposit: number | null = null
    if (depositStr) {
      const d = Number(depositStr)
      if (!Number.isFinite(d) || d < 0) {
        skipped.push({
          rowIndex: i + 1,
          reason: `Invalid security_deposit: ${depositStr}`,
        })
        continue
      }
      deposit = d
    }

    const rentDueDayStr = getCell(row, headerIndex, 'rent_due_day')
    let rentDueDay = 1
    if (rentDueDayStr) {
      const d = Number(rentDueDayStr)
      if (!Number.isInteger(d) || d < 1 || d > 31) {
        skipped.push({
          rowIndex: i + 1,
          reason: `rent_due_day must be 1-31 (got: ${rentDueDayStr})`,
        })
        continue
      }
      rentDueDay = d
    }

    const lateFeeStr = getCell(row, headerIndex, 'late_fee_amount')
    let lateFee: number | null = null
    if (lateFeeStr) {
      const f = Number(lateFeeStr)
      if (!Number.isFinite(f) || f < 0) {
        skipped.push({
          rowIndex: i + 1,
          reason: `Invalid late_fee_amount: ${lateFeeStr}`,
        })
        continue
      }
      lateFee = f
    }

    const graceStr = getCell(row, headerIndex, 'late_fee_grace_days')
    let grace: number | null = 5
    if (graceStr) {
      const g = Number(graceStr)
      if (!Number.isInteger(g) || g < 0) {
        skipped.push({
          rowIndex: i + 1,
          reason: `Invalid late_fee_grace_days: ${graceStr}`,
        })
        continue
      }
      grace = g
    }

    const statusRaw = getCell(row, headerIndex, 'status')?.toLowerCase() ?? 'active'
    if (!LEASE_STATUSES.includes(statusRaw)) {
      skipped.push({
        rowIndex: i + 1,
        reason: `Invalid status: ${statusRaw}. Must be one of ${LEASE_STATUSES.join(', ')}.`,
      })
      continue
    }

    toInsert.push({
      owner_id: user.id,
      tenant_id: tenantId,
      unit_id: unitId,
      status: statusRaw,
      start_date: startDate,
      end_date: endDate,
      monthly_rent: monthlyRent,
      security_deposit: deposit,
      rent_due_day: rentDueDay,
      late_fee_amount: lateFee,
      late_fee_grace_days: grace,
      notes: getCell(row, headerIndex, 'notes') ?? null,
    })
  }

  if (toInsert.length === 0) {
    return { success: true, imported: 0, skipped }
  }

  const { error } = await supabase.from('leases').insert(toInsert)
  if (error) {
    return {
      success: false,
      message: `Failed to import leases: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/tenants')
  revalidatePath('/dashboard/rent')
  revalidatePath('/dashboard')
  return { success: true, imported: toInsert.length, skipped }
}
