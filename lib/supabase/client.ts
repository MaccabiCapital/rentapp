// ============================================================
// Supabase browser client — use in client components only
// ============================================================
//
// This is a singleton client for interactive features (real-time
// subscriptions, client-side mutations, etc.). For most auth and
// data-fetching flows, prefer the server client in ./server.ts
// called from server components or server actions.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
