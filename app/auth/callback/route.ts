// ============================================================
// Auth callback route — handles Supabase email confirmation
// redirect after the user clicks the link in their verification
// email
// ============================================================
//
// Supabase sends the user back to this URL with a `code` query
// parameter. We exchange it for a session and redirect the user
// to the dashboard.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send the user back to sign-in with an error hint.
  return NextResponse.redirect(`${origin}/sign-in?error=auth-callback-failed`)
}
