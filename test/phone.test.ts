import { describe, it, expect } from 'vitest'
import { normalizeToE164, formatPhoneForDisplay } from '@/app/lib/phone'

describe('normalizeToE164', () => {
  it('normalizes a fully-qualified US number with country code', () => {
    expect(normalizeToE164('+1 617 555 0123')).toBe('+16175550123')
  })

  it('normalizes a US number without country code', () => {
    expect(normalizeToE164('617-555-0123')).toBe('+16175550123')
    expect(normalizeToE164('(617) 555-0123')).toBe('+16175550123')
    expect(normalizeToE164('6175550123')).toBe('+16175550123')
  })

  it('honors an explicit non-US default country', () => {
    // London 020 ... in GB format
    expect(normalizeToE164('020 7946 0958', 'GB')).toBe('+442079460958')
  })

  it('returns null for clearly invalid input', () => {
    expect(normalizeToE164('not a phone')).toBeNull()
    expect(normalizeToE164('')).toBeNull()
    expect(normalizeToE164('   ')).toBeNull()
    expect(normalizeToE164(null)).toBeNull()
    expect(normalizeToE164(undefined)).toBeNull()
  })

  it('returns null for too-short numbers', () => {
    expect(normalizeToE164('555')).toBeNull()
    expect(normalizeToE164('12345')).toBeNull()
  })

  it('is idempotent on already-E164 input', () => {
    const e164 = '+16175550123'
    expect(normalizeToE164(e164)).toBe(e164)
  })
})

describe('formatPhoneForDisplay', () => {
  it('formats an E.164 US number to national style', () => {
    const out = formatPhoneForDisplay('+16175550123')
    expect(out).toMatch(/617/) // exact format depends on locale
    expect(out).toMatch(/555/)
  })

  it('returns a dash when given null or undefined', () => {
    expect(formatPhoneForDisplay(null)).toBe('—')
    expect(formatPhoneForDisplay(undefined)).toBe('—')
    expect(formatPhoneForDisplay('')).toBe('—')
  })
})
