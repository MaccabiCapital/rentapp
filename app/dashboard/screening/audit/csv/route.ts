// ============================================================
// Screening audit log CSV export
// ============================================================
//
// GET /dashboard/screening/audit/csv
//
// Optional filters: prospectId, reportId. 7-year retention horizon.

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getScreeningAuditLog } from '@/app/lib/queries/screening'

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
  const prospectId = url.searchParams.get('prospectId') ?? undefined
  const reportId = url.searchParams.get('reportId') ?? undefined

  const events = await getScreeningAuditLog({
    prospectId,
    reportId,
    limit: 10000,
  })

  const header = [
    'timestamp',
    'event',
    'actor_kind',
    'actor_user_id',
    'prospect_id',
    'report_id',
    'event_data',
  ].join(',')

  const rows = events.map((e) =>
    [
      e.created_at,
      e.event,
      e.actor_kind,
      e.actor_user_id ?? '',
      e.prospect_id ?? '',
      e.report_id ?? '',
      csvEscape(
        e.event_data ? JSON.stringify(e.event_data) : '',
      ),
    ].join(','),
  )

  const csv = [header, ...rows].join('\r\n') + '\r\n'

  const dateTag = new Date().toISOString().slice(0, 10)
  const filename = `rentapp-screening-audit-${dateTag}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
