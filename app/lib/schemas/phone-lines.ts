// ============================================================
// Landlord phone lines (Sprint 13b) — schemas + types
// ============================================================

export const LINE_TYPE_VALUES = ['leasing', 'support'] as const
export type LineType = (typeof LINE_TYPE_VALUES)[number]
export const LINE_TYPE_LABELS: Record<LineType, string> = {
  leasing: 'Leasing line',
  support: 'Tenant support line',
}

export const LINE_STATUS_VALUES = [
  'pending',
  'active',
  'suspended',
] as const
export type LineStatus = (typeof LINE_STATUS_VALUES)[number]
export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
}

export type LandlordPhoneLine = {
  id: string
  owner_id: string
  line_type: LineType
  twilio_number: string | null
  retell_agent_id: string | null
  // NOTE: retell_webhook_secret is selected only for internal paths
  // (webhook signature verification in the route handler). The
  // dashboard query deliberately drops this column — see
  // app/lib/queries/phone-lines.ts.
  retell_webhook_secret: string | null
  status: LineStatus
  a2p_brand_id: string | null
  a2p_campaign_id: string | null
  created_at: string
  updated_at: string
}

// Shape returned to the dashboard — secret stripped.
export type LandlordPhoneLinePublic = Omit<
  LandlordPhoneLine,
  'retell_webhook_secret'
>
