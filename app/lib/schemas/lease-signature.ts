// ============================================================
// Lease signature schemas
// ============================================================

import * as z from 'zod'

export const LEASE_SIGNATURE_PARTY_VALUES = ['tenant', 'landlord'] as const
export type LeaseSignatureParty =
  (typeof LEASE_SIGNATURE_PARTY_VALUES)[number]

export const LEASE_SIGNATURE_PARTY_LABELS: Record<
  LeaseSignatureParty,
  string
> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
}

export const LEASE_SIGNATURE_STATUS_VALUES = [
  'pending',
  'signed',
  'voided',
] as const
export type LeaseSignatureStatus =
  (typeof LEASE_SIGNATURE_STATUS_VALUES)[number]

export const LEASE_SIGNATURE_STATUS_LABELS: Record<
  LeaseSignatureStatus,
  string
> = {
  pending: 'Awaiting signature',
  signed: 'Signed',
  voided: 'Voided',
}

export const LEASE_SIGNATURE_STATUS_BADGE: Record<
  LeaseSignatureStatus,
  string
> = {
  pending: 'bg-amber-100 text-amber-800',
  signed: 'bg-emerald-100 text-emerald-800',
  voided: 'bg-zinc-100 text-zinc-700',
}

export type LeaseSignature = {
  id: string
  owner_id: string
  lease_id: string
  party: LeaseSignatureParty
  status: LeaseSignatureStatus
  sign_token: string | null
  token_expires_at: string | null
  typed_name: string | null
  signature_image_path: string | null
  signature_drawn_at: string | null
  signed_at: string | null
  signed_ip: string | null
  signed_user_agent: string | null
  voided_at: string | null
  voided_reason: string | null
  created_at: string
  updated_at: string
}

// Form schemas

const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/

export const RecordSignatureSchema = z.object({
  typed_name: z
    .string()
    .trim()
    .min(2, { error: 'Type your full legal name to sign.' })
    .max(200),
  signature_data_url: z
    .string()
    .trim()
    .refine((v) => PNG_DATA_URL.test(v), {
      error: 'Signature image is missing or malformed.',
    })
    .refine((v) => v.length < 200_000, {
      error: 'Signature image is too large (>150 KB). Try a simpler signature.',
    }),
})

export type RecordSignatureInput = z.infer<typeof RecordSignatureSchema>

export const VoidSignatureSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: 'A reason is required for the audit log.' })
    .max(500),
})
export type VoidSignatureInput = z.infer<typeof VoidSignatureSchema>
