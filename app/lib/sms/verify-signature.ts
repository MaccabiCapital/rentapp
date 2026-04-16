// ============================================================
// Retell webhook HMAC verification
// ============================================================
//
// Pure function so it's unit-testable and doesn't need HTTP
// context. The webhook route reads the raw body BEFORE JSON
// parsing so the bytes match what was signed.
//
// IMPORTANT — the signature header name and digest format are
// best-guess from Retell's public docs and have NOT been verified
// against a live payload. See SPRINT-13-NEEDS.md §5 before going
// to production.

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify an incoming Retell webhook signature.
 *
 * @param rawBody - the exact bytes of the request body (string form)
 * @param signature - the header value, may include a `sha256=` prefix
 * @param secret - the shared secret stored on the landlord's phone line row
 * @returns true if the signature matches; false otherwise
 */
export function verifyRetellSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!signature || !secret) return false

  // Accept either "sha256=<hex>" or just "<hex>" — we'll narrow
  // this once we have a live payload.
  const provided = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature

  // TODO(sprint-13): confirm Retell's actual header format — see
  // SPRINT-13-NEEDS.md#5-retell-webhook-signature-verification
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  // Lengths must match before timingSafeEqual or it throws.
  if (provided.length !== expected.length) return false

  const a = Buffer.from(provided, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
