// ============================================================
// SMS media downloader — SSRF-safe fetch + Supabase upload
// ============================================================
//
// The webhook route receives media URLs from Retell/Twilio. Those
// URLs come from user-supplied payload data, so we MUST restrict
// outbound fetches to a hostname allowlist. Never remove this
// check — the webhook is unauthenticated, so a permissive fetch
// here would be a textbook SSRF vulnerability.
//
// See docs/SPRINT-13-NEEDS.md §7.

import { randomUUID } from 'node:crypto'

// TODO(sprint-13): confirm real Retell media CDN host — see
// SPRINT-13-NEEDS.md#7-ssrf-allowlist-for-inbound-media-download
const ALLOWED_HOSTS = new Set<string>([
  'api.twilio.com',
  'media.twilio.com',
  // Retell's media domain — placeholder until we see a real URL.
  'media.retellai.com',
])

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const FETCH_TIMEOUT_MS = 15_000
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
])

export type DownloadedMedia = {
  bytes: Buffer
  contentType: string
  extension: string
  filename: string
}

export async function downloadRemoteMedia(
  rawUrl: string,
): Promise<DownloadedMedia | null> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    console.warn('[sms-media] rejected host', parsed.hostname)
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: 'manual', // don't follow off-list redirects
    })
    // SECURITY: explicitly reject redirects so the allowlist stays
    // authoritative. `redirect: 'manual'` yields opaqueredirect in
    // most Node fetch impls, but we assert both type and status
    // codes so a future runtime swap doesn't silently start
    // following redirects to internal hosts. See review C-1.
    if (
      res.type === 'opaqueredirect' ||
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      console.warn('[sms-media] rejected redirect', res.status, res.type)
      return null
    }
    if (!res.ok) return null

    const contentType =
      res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      console.warn('[sms-media] rejected content-type', contentType)
      return null
    }

    const arrayBuf = await res.arrayBuffer()
    if (arrayBuf.byteLength > MAX_BYTES) {
      console.warn('[sms-media] rejected oversize', arrayBuf.byteLength)
      return null
    }

    const bytes = Buffer.from(arrayBuf)
    const extension = contentType.split('/')[1] === 'jpeg'
      ? 'jpg'
      : contentType.split('/')[1] ?? 'bin'

    return {
      bytes,
      contentType,
      extension,
      filename: `${randomUUID()}.${extension}`,
    }
  } catch (err) {
    console.warn('[sms-media] fetch failed', (err as Error).message)
    return null
  } finally {
    clearTimeout(timer)
  }
}
