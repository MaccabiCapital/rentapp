// ============================================================
// Phone number normalization
// ============================================================
//
// Everything we store in the DB is E.164 (e.g. +16175550123). The
// webhook normalizes inbound numbers before looking them up in
// tenant_sms_identities, and the dashboard form normalizes on
// submit. Library: libphonenumber-js (server-side only, but no
// Node-specific API so it works in both places).

import parsePhoneNumberFromString from 'libphonenumber-js'

export type PhoneCountry = 'US' | 'CA' | 'GB' | 'AU' | string

/**
 * Normalize any phone input to E.164 format. Returns null if the
 * input can't be parsed into a valid number.
 *
 * Examples:
 *   normalizeToE164('+1 617 555 0123')  → '+16175550123'
 *   normalizeToE164('(617) 555-0123')   → '+16175550123'
 *   normalizeToE164('617-555-0123')     → '+16175550123'
 *   normalizeToE164('abc')              → null
 */
export function normalizeToE164(
  raw: string | null | undefined,
  defaultCountry: PhoneCountry = 'US',
): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as 'US')
    if (!parsed || !parsed.isValid()) return null
    return parsed.number // E.164 (with leading +)
  } catch {
    return null
  }
}

/**
 * Format an E.164 number for display. Falls back to the raw input
 * if parsing fails so we never show an empty cell.
 */
export function formatPhoneForDisplay(
  e164: string | null | undefined,
): string {
  if (!e164) return '—'
  try {
    const parsed = parsePhoneNumberFromString(e164)
    if (parsed) return parsed.formatNational()
  } catch {
    // ignore and fall through
  }
  return e164
}
