// ============================================================
// Supabase service role client — SERVER ONLY
// ============================================================
//
// Bypasses RLS. Use ONLY for:
//   - Public form submissions where the visitor isn't authenticated
//     but we need to write a row on behalf of a landlord
//   - Admin tasks like migrations + seed data
//
// NEVER import this from a client component. NEVER expose the
// service role key via a public route handler that accepts
// arbitrary input without validating against RLS-equivalent rules
// first.
//
// Current usage:
//   - app/actions/listings.ts submitInquiry (validates slug maps
//     to a real listing, uses that listing's owner_id as the
//     prospect owner, rate-limits by Turnstile challenge)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// We use `any` for the generated Database type because this app
// doesn't ship with generated types. Every other Supabase client
// in the app does the same — the trade is no auto-complete on
// column names in exchange for not regenerating types per migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: SupabaseClient<any, 'public', any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceRoleClient(): SupabaseClient<any, 'public', any> {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Service role client not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local — get it from Supabase dashboard > Settings > API > service_role.',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = createClient<any, 'public', any>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return cached
}
