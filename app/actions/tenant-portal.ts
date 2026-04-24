'use server'

// ============================================================
// Tenant portal invite / revoke
// ============================================================
//
// Generates a random, unguessable token on a tenant row and
// returns the portal URL. Regenerating replaces the token so
// any previously-shared URL stops working.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/app/lib/types'

function generateToken(): string {
  // 32 url-safe chars from crypto.getRandomValues
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  // base64url
  const b64 = Buffer.from(bytes).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function generateTenantPortalToken(
  tenantId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const token = generateToken()
  const { error } = await supabase
    .from('tenants')
    .update({
      portal_token: token,
      portal_token_generated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to generate portal link: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
  return { success: true }
}

export async function revokeTenantPortalToken(
  tenantId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('tenants')
    .update({ portal_token: null, portal_token_generated_at: null })
    .eq('id', tenantId)
    .eq('owner_id', user.id)

  if (error) {
    return {
      success: false,
      message: `Failed to revoke: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
  return { success: true }
}
