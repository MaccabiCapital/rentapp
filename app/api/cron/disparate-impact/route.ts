// ============================================================
// Disparate-impact nightly cron
// ============================================================
//
// Vercel cron schedule (vercel.json): daily at 03:00 UTC.
// Bearer-token auth via CRON_SECRET, matching late-fee pattern.

import { NextResponse } from 'next/server'
import { runDisparateImpactForAll } from '@/app/lib/compliance/disparate-impact'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await runDisparateImpactForAll()
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
