// ============================================================
// Supabase client for proxy.ts (Next 16's middleware replacement)
// ============================================================
//
// The proxy runs on every request and needs to refresh the auth
// cookie if it's expired. This is the one context where the Supabase
// SSR helper takes a NextRequest/NextResponse pair directly.
//
// Per Next 16 docs, proxy should only do optimistic session checks
// — real authorization happens in layouts/server components.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // This call refreshes the auth session if the cookie is expired.
  // Without this call, users would be silently logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
