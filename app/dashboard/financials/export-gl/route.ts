// ============================================================
// General Ledger CSV export (QuickBooks / Xero / Wave compatible)
// ============================================================
//
// Different from /dashboard/financials/export which is the
// Schedule E flat tax-filing CSV. This one is double-entry GL
// in the format every major accounting tool will import:
//
//   Date,Account,Debit,Credit,Memo,Class
//
// Query params:
//   from (YYYY-MM-DD)  — start, defaults to Jan 1 current year
//   to   (YYYY-MM-DD)  — end, defaults to Dec 31 current year

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildGeneralLedger,
  ledgerToCsv,
} from '@/app/lib/accounting/general-ledger'

function yearStart(): string {
  return `${new Date().getUTCFullYear()}-01-01`
}
function yearEnd(): string {
  return `${new Date().getUTCFullYear()}-12-31`
}
function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
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
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const fromDate =
    fromParam && isValidIsoDate(fromParam) ? fromParam : yearStart()
  const toDate =
    toParam && isValidIsoDate(toParam) ? toParam : yearEnd()

  const entries = await buildGeneralLedger({ fromDate, toDate })
  const csv = ledgerToCsv(entries)
  const filename = `rentbase-gl-${fromDate}-to-${toDate}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
