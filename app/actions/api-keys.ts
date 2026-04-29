'use server'

// ============================================================
// API key management
// ============================================================
//
// generateApiKey: mints a new key. Returns the FULL secret on
// the response (the only time it's available); the user must
// copy it. Storage saves only the SHA-256 hash + last-4 + name.
//
// revokeApiKey: flips revoked_at to now(). The key stops working
// on the next request.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  generateApiSecret,
  hashApiSecret,
} from '@/app/lib/api/auth'

export type GenerateKeyResult =
  | { success: true; secret: string; last4: string; keyId: string }
  | { success: false; message: string }

export async function generateApiKey(formData: FormData): Promise<GenerateKeyResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Sign in.' }

  const name = String(formData.get('name') ?? '').trim().slice(0, 80) || null
  const scopesRaw = String(formData.get('scopes') ?? 'read').trim()
  const scopes =
    scopesRaw === 'write' ? ['read', 'write'] : ['read']

  const { full, last4 } = generateApiSecret()
  const secretHash = hashApiSecret(full)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      owner_id: user.id,
      prefix: 'rb_live_',
      last_4: last4,
      secret_hash: secretHash,
      name,
      scopes,
    })
    .select('id')
    .single()

  if (error || !data) {
    return {
      success: false,
      message: error?.message ?? 'Could not generate key.',
    }
  }

  revalidatePath('/dashboard/settings/api')
  return { success: true, secret: full, last4, keyId: data.id }
}

export async function revokeApiKey(keyId: string): Promise<
  | { success: true }
  | { success: false; message: string }
> {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) return { success: false, message: error.message }

  revalidatePath('/dashboard/settings/api')
  return { success: true }
}
