// ============================================================
// tenant_sms_identities (Sprint 13b) — schemas + types
// ============================================================

import * as z from 'zod'

export type TenantSmsIdentity = {
  id: string
  owner_id: string
  tenant_id: string
  phone_number: string // E.164
  verified_at: string | null
  verification_method: string | null
  created_at: string
}

export const LinkPhoneToTenantSchema = z.object({
  tenant_id: z.string().uuid({ error: 'Pick a tenant.' }),
  phone_number: z
    .string()
    .trim()
    .min(7, { error: 'Phone number looks too short.' }),
})

export type LinkPhoneToTenantInput = z.infer<typeof LinkPhoneToTenantSchema>
