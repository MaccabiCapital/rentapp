// ============================================================
// Supabase server client — use in server components, server
// actions, route handlers, and proxy.ts
// ============================================================
//
// This client reads/writes the Supabase auth session from cookies
// via Next.js's async `cookies()` API. Because it touches cookies,
// it MUST be called inside a request context (not at module scope).
//
// Usage:
//   const supabase = await createServerClient()
//   const { data: { user } } = await supabase.auth.getUser()

import { cookies } from 'next/headers'
import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            )
          } catch {
            // `setAll` may be called from a Server Component where
            // setting cookies is disallowed. Proxy refreshes the
            // session cookies, so this fallback is safe to ignore.
          }
        },
      },
    },
  )
}
