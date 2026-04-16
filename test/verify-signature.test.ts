import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyRetellSignature } from '@/app/lib/sms/verify-signature'

function sign(body: string, secret: string) {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

describe('verifyRetellSignature', () => {
  const secret = 'a'.repeat(64)
  const body = '{"event":"chat_started","chat_id":"c1"}'
  const goodSig = sign(body, secret)

  it('accepts a valid bare-hex signature', () => {
    expect(verifyRetellSignature(body, goodSig, secret)).toBe(true)
  })

  it('accepts a sha256= prefixed signature', () => {
    expect(verifyRetellSignature(body, `sha256=${goodSig}`, secret)).toBe(true)
  })

  it('is case-insensitive on hex characters', () => {
    expect(verifyRetellSignature(body, goodSig.toUpperCase(), secret)).toBe(
      true,
    )
  })

  it('rejects when the body was tampered with', () => {
    const tampered = body + ' '
    expect(verifyRetellSignature(tampered, goodSig, secret)).toBe(false)
  })

  it('rejects when the secret is wrong', () => {
    expect(verifyRetellSignature(body, goodSig, 'z'.repeat(64))).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyRetellSignature(body, null, secret)).toBe(false)
    expect(verifyRetellSignature(body, undefined, secret)).toBe(false)
    expect(verifyRetellSignature(body, '', secret)).toBe(false)
  })

  it('rejects a missing or empty secret', () => {
    expect(verifyRetellSignature(body, goodSig, null)).toBe(false)
    expect(verifyRetellSignature(body, goodSig, undefined)).toBe(false)
    expect(verifyRetellSignature(body, goodSig, '')).toBe(false)
  })

  it('rejects a signature with non-hex characters', () => {
    // 64 chars, but contains a 'g' — Buffer.from would have silently
    // truncated. The explicit regex check blocks this.
    const bogus = 'g' + goodSig.slice(1)
    expect(verifyRetellSignature(body, bogus, secret)).toBe(false)
  })

  it('rejects a signature of wrong length', () => {
    expect(verifyRetellSignature(body, goodSig.slice(0, 63), secret)).toBe(
      false,
    )
    expect(verifyRetellSignature(body, goodSig + '0', secret)).toBe(false)
  })
})
