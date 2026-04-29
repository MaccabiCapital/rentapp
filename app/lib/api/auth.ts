// ============================================================
// API auth — Bearer token verification + rate limiting
// ============================================================
//
// Every /api/v1/* route calls authenticateApiRequest() at the
// top. Returns either an AuthSuccess (with the resolved owner_id
// + scopes) or an AuthError (already an unauthenticated NextResponse
// the route can return directly).
//
// Auth model:
//   Authorization: Bearer rb_live_<26-char secret>
//
// We hash the secret on lookup and compare against api_keys.secret_hash.
// pgcrypto's crypt() handles the bcrypt-equivalent compare in SQL.
//
// Rate limit: 60 req/min per key, in-memory bucket. Good enough for
// v1 (single Vercel region); upgrade to Redis when traffic warrants.

import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { getServiceRoleClient } from '@/lib/supabase/service-role'

export type AuthSuccess = {
  ok: true
  ownerId: string
  scopes: string[]
  keyId: string
}

export type AuthError = { ok: false; response: NextResponse }

// ---- Secret generation ----

export function generateApiSecret(): { full: string; last4: string } {
  // 26 base64url-safe chars after the prefix; ~155 bits of entropy.
  const bytes = randomBytes(20)
  const tail = bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
    .slice(0, 26)
  const full = `rb_live_${tail}`
  return { full, last4: tail.slice(-4) }
}

// We hash with SHA-256 (deterministic) for lookup, since bcrypt's
// per-row salt would force a full-table scan. SHA-256 is fine here
// because the input is high-entropy random (155 bits) — rainbow
// tables don't apply.
export function hashApiSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

// ---- Verification ----

export async function authenticateApiRequest(
  request: Request,
): Promise<AuthSuccess | AuthError> {
  const authHeader = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(rb_live_[A-Za-z0-9_-]{20,})$/i.exec(authHeader)
  if (!match) {
    return {
      ok: false,
      response: jsonError(401, 'Missing or invalid Authorization header'),
    }
  }

  const fullSecret = match[1]
  const secretHash = hashApiSecret(fullSecret)

  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, owner_id, scopes, revoked_at, last_used_at')
    .eq('secret_hash', secretHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, response: jsonError(401, 'Invalid API key') }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any

  // Rate limit check
  const limit = checkRateLimit(row.id)
  if (!limit.allowed) {
    return {
      ok: false,
      response: jsonError(
        429,
        `Rate limit exceeded. Reset in ${limit.resetInSeconds}s.`,
      ),
    }
  }

  // Bump last_used_at (fire-and-forget)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)

  return {
    ok: true,
    ownerId: row.owner_id,
    scopes: row.scopes ?? ['read'],
    keyId: row.id,
  }
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: { message } }, { status })
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// ---- Rate limiter ----

// In-memory token bucket per key. Resets every 60s.
type Bucket = { count: number; resetsAt: number }
const buckets = new Map<string, Bucket>()
const PER_MINUTE_LIMIT = 60

function checkRateLimit(keyId: string): {
  allowed: boolean
  resetInSeconds: number
} {
  const now = Date.now()
  const bucket = buckets.get(keyId)
  if (!bucket || now >= bucket.resetsAt) {
    buckets.set(keyId, { count: 1, resetsAt: now + 60_000 })
    return { allowed: true, resetInSeconds: 60 }
  }
  bucket.count += 1
  const resetIn = Math.ceil((bucket.resetsAt - now) / 1000)
  if (bucket.count > PER_MINUTE_LIMIT) {
    return { allowed: false, resetInSeconds: resetIn }
  }
  return { allowed: true, resetInSeconds: resetIn }
}

// ---- Pagination helpers ----

export type PageOpts = {
  limit: number
  cursor: string | null
}

export function parsePageOpts(url: URL): PageOpts {
  const rawLimit = Number(url.searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), 100)
    : 50
  const cursor = url.searchParams.get('cursor')
  return { limit, cursor }
}
