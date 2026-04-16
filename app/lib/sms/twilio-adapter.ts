// ============================================================
// Twilio adapter — STUBBED
// ============================================================
//
// Sprint 13b relies on Twilio only indirectly (Retell provisions
// numbers on Twilio's behalf). The one place we touch Twilio
// directly is downloading MMS media, which we stub here until a
// real inbound message gives us a concrete URL format to handle.
//
// See docs/SPRINT-13-NEEDS.md §2 and §7.

// TODO(sprint-13): swap for real Twilio client once we collect
// landlord credentials via the settings UI. See SPRINT-13-NEEDS.md§2.
export async function downloadMediaUrl(url: string): Promise<{
  data: Buffer
  contentType: string
} | null> {
  // The real implementation uses basic-auth with the landlord's
  // Twilio SID + Auth Token. That flow belongs inside the webhook
  // route because the credentials are per-tenant.
  console.warn('[SPRINT-13 STUB] downloadMediaUrl called for', url)
  return null
}
