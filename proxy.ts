// ============================================================
// Proxy (Next 16's middleware) — session refresh + optimistic
// route protection
// ============================================================
//
// This runs on every request that matches the `matcher` below.
// It calls Supabase's getUser() which refreshes the auth cookie
// when it's expired. Without this, users would be silently
// logged out.
//
// IMPORTANT: Per Next 16 docs, do NOT use this for full auth
// enforcement. Layouts and server components must re-check auth
// themselves. This is optimistic only.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-client'

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes.
  // This is an OPTIMISTIC check — layouts in /dashboard also
  // verify and redirect if needed.
  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isAuthRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname === '/'

  if (isProtectedRoute && !user) {
    // Build a fresh URL so we don't leak query-string debris from
    // the original request (which would cause a redirect loop when
    // the sign-in page passes a "next=" that points back here).
    const url = new URL(request.url)
    url.pathname = '/sign-in'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated users who hit the sign-in / sign-up pages
  // should bounce to the dashboard. Fresh URL, no query debris.
  if (isAuthRoute && user && pathname !== '/') {
    const url = new URL(request.url)
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on every request EXCEPT static assets and Next internals.
  // This is the canonical Next 16 pattern from the docs.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
