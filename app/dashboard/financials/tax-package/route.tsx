// ============================================================
// Tax package PDF download route
// ============================================================
//
// GET /dashboard/financials/tax-package?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns a one-page portfolio P&L PDF for the specified window.
// Defaults to the current calendar year when no range is given.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@/lib/supabase/server'
import { getPortfolioPnL } from '@/app/lib/queries/financials'
import { TaxPackagePdf } from '@/app/ui/tax-package-pdf'

function yearStart(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-01-01`
}
function yearEnd(): string {
  const y = new Date().getUTCFullYear()
  return `${y}-12-31`
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
  const from = url.searchParams.get('from') ?? yearStart()
  const to = url.searchParams.get('to') ?? yearEnd()

  const { rows, totals } = await getPortfolioPnL(from, to)

  const landlordName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    'Landlord'

  const generatedOn = new Date().toISOString().slice(0, 10)

  const pdf = await renderToBuffer(
    <TaxPackagePdf
      rows={rows}
      totals={totals}
      fromDate={from}
      toDate={to}
      landlordName={landlordName}
      generatedOn={generatedOn}
    />,
  )

  const filename = `tax-package-${from}-to-${to}.pdf`.replace(
    /[^a-zA-Z0-9.\-_]/g,
    '-',
  )

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
