// ============================================================
// Daily late-fee auto-scan — Vercel cron endpoint
// ============================================================
//
// Schedule (vercel.json): every day at 09:00 UTC.
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`
// when CRON_SECRET is configured in project env. Reject anything
// without a matching token so the endpoint can't be hit by random
// internet traffic.

import { NextResponse } from 'next/server'
import { scanAndApplyLateFees } from '@/app/lib/late-fees/scanner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    // Fail closed if the secret isn't configured. Don't reveal config.
    return new NextResponse('Forbidden', { status: 403 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await scanAndApplyLateFees()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'unknown error',
      },
      { status: 500 },
    )
  }
}
