'use server'

// ============================================================
// Syndication feed token — generate / revoke
// ============================================================
//
// The feed URL is `/api/listings/feed/[token]/route.xml`. Rotating
// the token invalidates the old URL. Listings inside the feed
// are already public data (each has its own /listings/[slug] page),
// so the token just scopes the feed to one landlord's listings.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/app/lib/types'

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function generateSyndicationFeedToken(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const token = generateToken()

  const { error } = await supabase.from('landlord_settings').upsert(
    {
      owner_id: user.id,
      listings_feed_token: token,
      listings_feed_generated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id' },
  )

  if (error) {
    return {
      success: false,
      message: `Failed to generate feed token: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/listings')
  return { success: true }
}

export async function revokeSyndicationFeedToken(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('landlord_settings')
    .update({
      listings_feed_token: null,
      listings_feed_generated_at: null,
    })
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to revoke: ${error.message}`,
    }
  }

  revalidatePath('/dashboard/listings')
  return { success: true }
}

export async function getSyndicationFeedSettings(): Promise<{
  token: string | null
  generatedAt: string | null
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { token: null, generatedAt: null }

  const { data } = await supabase
    .from('landlord_settings')
    .select('listings_feed_token, listings_feed_generated_at')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!data) return { token: null, generatedAt: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    token: r.listings_feed_token ?? null,
    generatedAt: r.listings_feed_generated_at ?? null,
  }
}
