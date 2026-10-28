// Sign-in codes from an authenticator app (Microsoft or Google Authenticator): TOTP, RFC 6238 - a 6-digit code
// from a shared secret and the time, changing every 30 seconds. No SMS, so a SIM swap can't intercept it.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD = 30

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(text) {
  let bits = 0, value = 0
  const out = []
  for (const ch of text.replace(/[\s=]/g, '').toUpperCase()) {
    const i = B32.indexOf(ch)
    if (i < 0) throw new Error('Invalid secret')
    value = (value << 5) | i
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return new Uint8Array(out)
}

/** A new random secret (160 bits, the size authenticator apps expect). */
export const newSecret = () => base32Encode(crypto.getRandomValues(new Uint8Array(20)))

/** The 6-digit code for a 30-second time step. */
export async function codeAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const counter = new DataView(new ArrayBuffer(8))
  counter.setUint32(0, Math.floor(step / 2 ** 32))
  counter.setUint32(4, step >>> 0)
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter.buffer))
  const at = mac[mac.length - 1] & 15
  const n = ((mac[at] & 127) << 24) | (mac[at + 1] << 16) | (mac[at + 2] << 8) | mac[at + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/**
 * Checks a code, allowing one step either side for a phone clock that's slightly off. Returns the matching step,
 * or null. Steps at or before `lastStep` are refused, so a code can't be used twice (e.g. one seen over a shoulder).
 */
export async function verifyCode(secret, code, lastStep = -1, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return null
  const current = Math.floor(now / 1000 / PERIOD)
  for (const step of [current - 1, current, current + 1]) {
    if (step > lastStep && await codeAt(secret, step) === code) return step
  }
  return null
}

/** The link an authenticator app reads from the QR code. */
export const otpauthUrl = (secret, account) =>
  `otpauth://totp/${encodeURIComponent(`TriGuard AI:${account}`)}?secret=${secret}&issuer=${encodeURIComponent('TriGuard AI')}&algorithm=SHA1&digits=6&period=${PERIOD}`
