'use server'

// ============================================================
// Syndication feed actions
// ============================================================
//
// enableFeed: mints a new token and creates the feed row
// disableFeed: flips is_active false (URL stops responding)
// rotateToken: revoke the existing token and mint a new one
// (used if a token leaks)

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/app/lib/types'

function generateToken(): string {
  // 32-byte base64url, opaque. Good enough as a credential
  // for an unauth feed URL (matches the lease-sign token pattern).
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export async function enableSyndicationFeed(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  // If a feed already exists, re-activate it instead of duplicating.
  const { data: existing } = await supabase
    .from('syndication_feeds')
    .select('id, is_active')
    .maybeSingle()

  if (existing) {
    await supabase
      .from('syndication_feeds')
      .update({ is_active: true })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase.from('syndication_feeds').insert({
      owner_id: user.id,
      feed_token: generateToken(),
      is_active: true,
    })
    if (error) {
      return { success: false, message: error.message }
    }
  }

  revalidatePath('/dashboard/listings/syndication')
  return { success: true }
}

export async function disableSyndicationFeed(): Promise<ActionState> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('syndication_feeds')
    .update({ is_active: false })
    .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '')
  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/listings/syndication')
  return { success: true }
}

export async function rotateSyndicationToken(): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const { error } = await supabase
    .from('syndication_feeds')
    .update({ feed_token: generateToken() })
    .eq('owner_id', user.id)
  if (error) return { success: false, message: error.message }
  revalidatePath('/dashboard/listings/syndication')
  return { success: true }
}
