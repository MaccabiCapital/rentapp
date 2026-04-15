// ============================================================
// getUser — safe wrapper around Supabase.auth.getUser()
// ============================================================
//
// Returns the authenticated user, or null if:
//   - Env vars aren't configured (e.g., before `.env.local` is set)
//   - The session cookie is missing or invalid
//   - Supabase is unreachable
//
// Use this in server components and layouts to avoid crashes
// when the environment is half-configured during setup.

import type { User } from '@supabase/supabase-js'
import { createServerClient } from './server'

export async function getUser(): Promise<User | null> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null
    }
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}
