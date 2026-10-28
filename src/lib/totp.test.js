import { describe, expect, it } from 'vitest'
import { base32Encode, codeAt, newSecret, verifyCode } from './totp.js'

// RFC 6238 test secret: the ASCII bytes of "12345678901234567890".
const SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'))

describe('sign-in codes (TOTP)', () => {
  it('matches the RFC 6238 test vectors', async () => {
    expect(SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(await codeAt(SECRET, 1)).toBe('287082') // T = 59 s
    expect(await codeAt(SECRET, Math.floor(1111111109 / 30))).toBe('081804')
  })

  it('accepts a code from a slightly fast or slow phone, and never the same code twice', async () => {
    const now = 1_700_000_000_000
    const step = Math.floor(now / 30000)
    const code = await codeAt(SECRET, step - 1)
    expect(await verifyCode(SECRET, code, -1, now)).toBe(step - 1)
    expect(await verifyCode(SECRET, code, step - 1, now)).toBeNull() // already used
    expect(await verifyCode(SECRET, await codeAt(SECRET, step - 3), -1, now)).toBeNull() // too old
    expect(await verifyCode(SECRET, '12345', -1, now)).toBeNull()
  })

  it('makes 160-bit secrets', () => {
    expect(newSecret()).toMatch(/^[A-Z2-7]{32}$/)
  })
})
