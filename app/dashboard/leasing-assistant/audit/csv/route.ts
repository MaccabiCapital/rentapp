// ============================================================
// Fair-housing audit log CSV export
// ============================================================
//
// GET /dashboard/leasing-assistant/audit/csv
//
// Same filter query-params as the viewer. Returns a CSV suitable
// for retention (FCRA requires 3+ year retention).

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  getFairHousingAuditEvents,
  type AuditFlagCategory,
} from '@/app/lib/queries/fair-housing-audit'

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const needsQuoting = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

function parseCategoryParam(
  v: string | null,
): AuditFlagCategory | undefined {
  if (v === 'input_warning' || v === 'output_flag') return v
  return undefined
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
  const category = parseCategoryParam(url.searchParams.get('category'))
  const overridesOnly = url.searchParams.get('overrides') === 'true'
  const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

  const events = await getFairHousingAuditEvents({
    category,
    overridesOnly,
    includeDeleted,
  })

  const header = [
    'timestamp',
    'conversation_id',
    'conversation_name',
    'prospect_contact',
    'message_id',
    'direction',
    'flag_category',
    'flag_type',
    'flag_label',
    'flag_note',
    'matched_text',
    'content_excerpt',
    'override_applied',
  ].join(',')

  const rows = events.map((e) =>
    [
      e.timestamp,
      e.conversation_id,
      csvEscape(e.conversation_name),
      csvEscape(e.prospect_contact),
      e.message_id,
      e.direction,
      e.flag_category,
      e.flag_type,
      csvEscape(e.flag_label),
      csvEscape(e.flag_note),
      csvEscape(e.matched_text),
      csvEscape(e.content_excerpt),
      String(e.override_applied),
    ].join(','),
  )

  const csv = [header, ...rows].join('\r\n') + '\r\n'

  const dateTag = new Date().toISOString().slice(0, 10)
  const filename = `rentapp-fair-housing-audit-${dateTag}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
