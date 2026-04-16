'use server'

// ============================================================
// tenant_sms_identities server actions
// ============================================================

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { LinkPhoneToTenantSchema } from '@/app/lib/schemas/sms-identities'
import { normalizeToE164 } from '@/app/lib/phone'
import type { ActionState } from '@/app/lib/types'

function parseForm(formData: FormData) {
  return {
    tenant_id: formData.get('tenant_id'),
    phone_number: formData.get('phone_number'),
  }
}

export async function linkPhoneToTenant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LinkPhoneToTenantSchema.safeParse(parseForm(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const e164 = normalizeToE164(parsed.data.phone_number)
  if (!e164) {
    return {
      success: false,
      errors: {
        phone_number: [
          "That phone number doesn't look valid — please include the country code (e.g. +1 617 555 0123).",
        ],
      },
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  const { error } = await supabase.from('tenant_sms_identities').insert({
    owner_id: user.id,
    tenant_id: parsed.data.tenant_id,
    phone_number: e164,
    verified_at: new Date().toISOString(),
    verification_method: 'manual',
  })
  if (error) {
    const isDup = /duplicate key/i.test(error.message)
    return {
      success: false,
      message: isDup
        ? 'That phone number is already linked to one of your tenants.'
        : `Could not link phone: ${error.message}`,
    }
  }

  revalidatePath(`/dashboard/tenants/${parsed.data.tenant_id}`)
  revalidatePath('/dashboard/settings/sms')
  return { success: true }
}

// Called by the triage inbox when the landlord assigns an unknown
// inbound number to a known tenant. Creates both the identity row
// AND flips the triage communication to point at the tenant.
export async function assignTriageToTenant(
  triageCommId: string,
  tenantId: string,
  phoneNumber: string,
): Promise<ActionState> {
  const e164 = normalizeToE164(phoneNumber)
  if (!e164) {
    return {
      success: false,
      message: 'Phone number on that triage entry looks invalid.',
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }

  // Upsert the identity (idempotent — future messages from this
  // number will auto-resolve).
  const { error: idErr } = await supabase
    .from('tenant_sms_identities')
    .upsert(
      {
        owner_id: user.id,
        tenant_id: tenantId,
        phone_number: e164,
        verified_at: new Date().toISOString(),
        verification_method: 'triage_assign',
      },
      { onConflict: 'owner_id,phone_number' },
    )
  if (idErr) {
    return {
      success: false,
      message: `Could not link phone: ${idErr.message}`,
    }
  }

  // Retarget the triage communication at the tenant. Explicit
  // owner_id filter is defense in depth — RLS on communications
  // already checks auth.uid() = owner_id, but belt-and-braces
  // means a relaxed policy in the future doesn't open a hole
  // letting a landlord reassign another landlord's triage row.
  // See review M-3.
  const { error: commErr } = await supabase
    .from('communications')
    .update({
      entity_type: 'tenant',
      entity_id: tenantId,
      metadata: { reassigned_from: 'triage', reassigned_phone: e164 },
    })
    .eq('id', triageCommId)
    .eq('owner_id', user.id)
  if (commErr) {
    return {
      success: false,
      message: `Identity linked but triage update failed: ${commErr.message}`,
    }
  }

  revalidatePath('/dashboard/inbox')
  revalidatePath(`/dashboard/tenants/${tenantId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function dismissTriage(
  triageCommId: string,
): Promise<ActionState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be signed in.' }
  }
  const { error } = await supabase
    .from('communications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', triageCommId)
    .eq('owner_id', user.id) // defense in depth beyond RLS
  if (error) {
    return { success: false, message: `Could not dismiss: ${error.message}` }
  }
  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function unlinkPhone(identityId: string): Promise<ActionState> {
  const supabase = await createServerClient()
  const { data: row } = await supabase
    .from('tenant_sms_identities')
    .select('tenant_id')
    .eq('id', identityId)
    .maybeSingle()

  const { error } = await supabase
    .from('tenant_sms_identities')
    .delete()
    .eq('id', identityId)
  if (error) {
    return { success: false, message: `Could not unlink: ${error.message}` }
  }
  if (row) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    revalidatePath(`/dashboard/tenants/${r.tenant_id}`)
  }
  revalidatePath('/dashboard/settings/sms')
  return { success: true }
}
