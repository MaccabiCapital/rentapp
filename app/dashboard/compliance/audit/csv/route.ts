// ============================================================
// Compliance audit log CSV export
// ============================================================
//
// GET /dashboard/compliance/audit/csv
// Optional filters: findingId, criteriaId, diRunId. 7-year retention.

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getComplianceAuditLog } from '@/app/lib/queries/compliance'

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const needsQuoting = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  const findingId = url.searchParams.get('findingId') ?? undefined
  const criteriaId = url.searchParams.get('criteriaId') ?? undefined
  const diRunId = url.searchParams.get('diRunId') ?? undefined

  const events = await getComplianceAuditLog({
    findingId,
    criteriaId,
    diRunId,
    limit: 50000,
  })

  const header = [
    'timestamp',
    'event',
    'actor_kind',
    'actor_user_id',
    'finding_id',
    'criteria_id',
    'di_run_id',
    'event_data',
  ].join(',')

  const rows = events.map((e) =>
    [
      e.created_at,
      e.event,
      e.actor_kind,
      e.actor_user_id ?? '',
      e.finding_id ?? '',
      e.criteria_id ?? '',
      e.di_run_id ?? '',
      csvEscape(e.event_data ? JSON.stringify(e.event_data) : ''),
    ].join(','),
  )

  const csv = [header, ...rows].join('\r\n') + '\r\n'

  const dateTag = new Date().toISOString().slice(0, 10)
  const filename = `rentapp-compliance-audit-${dateTag}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
