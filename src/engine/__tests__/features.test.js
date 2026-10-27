// Evidence from the protection features: contact verification, safe word, liveness, SIM swap, bank-account checks,
// link reputation, images and scam waves.
import { describe, expect, it } from 'vitest'
import { analyze } from '../index.js'

const mom = { name: 'Mom', num: '+27825550143' }
const ctx = { findTrusted: n => (n === mom.num ? mom : undefined) }
const call = extra => ({ channel: 'call', from: mom.num, text: 'Hi, it’s me. Can you send R2000 for groceries?', ...extra })
const ids = r => r.signals.map(s => s.id)

describe('“Is it really you?” and the family safe word', () => {
  it('the contact saying “not me” makes it High, whatever else', () => {
    const r = analyze(call({ verification: { contact: 'Mom', answer: 'no' } }), ctx)
    expect(r.level).toBe('high')
    expect(r.type).toBe('impostor')
  })
  it('a “yes” is recorded as a note, not as proof of safety', () => {
    const r = analyze(call({ verification: { contact: 'Mom', answer: 'yes' } }), ctx)
    expect(r.notes.join(' ')).toMatch(/confirmed/)
    expect(ids(r)).not.toContain('verifyNo')
  })
  it('a wrong safe word is High', () => {
    expect(analyze(call({ safeWord: 'fail' }), ctx).level).toBe('high')
  })
})

describe('SIM swap', () => {
  it('a saved number with a fresh SIM asking for money is High', () => {
    const r = analyze(call({ simSwap: { hoursAgo: 3 } }), ctx)
    expect(ids(r)).toContain('simSwap')
    expect(r.level).toBe('high')
  })
  it('an old SIM change is ignored', () => {
    expect(ids(analyze(call({ simSwap: { hoursAgo: 400 } }), ctx))).not.toContain('simSwap')
  })
})

describe('video liveness check', () => {
  it('a failed check is High and named a deepfake', () => {
    const r = analyze({ channel: 'video', from: '+27615558890', text: 'Please approve the payment.', liveness: 'fail' })
    expect(r.level).toBe('high')
    expect(r.type).toBe('deepfakeVideo')
  })
})

describe('bank account verification', () => {
  it('an account not in the supplier’s name is High', () => {
    const r = analyze({ channel: 'email', fromAddr: 'accounts@karoosupplies.co.za', text: 'Please pay invoice 4471.', accountCheck: { holder: 'Karoo Supplies (Pty) Ltd', nameMatch: false } })
    expect(r.level).toBe('high')
    expect(r.type).toBe('invoice')
  })
})

describe('links', () => {
  it('a known scam site is High', () => {
    expect(analyze({ channel: 'sms', text: 'See https://pay-here.example', linkIntel: [{ host: 'pay-here.example', listed: true }] }).level).toBe('high')
  })
  it('a brand-new domain adds a warning', () => {
    expect(ids(analyze({ channel: 'sms', text: 'See shop-deals.co.za', linkIntel: [{ host: 'shop-deals.co.za', ageDays: 3 }] }))).toContain('newDomain')
  })
  it('a brand spelled one letter wrong is flagged', () => {
    expect(ids(analyze({ channel: 'sms', text: 'Log in at https://capltec.co.za/secure' }))).toContain('typosquat')
  })
  it('the real brand domain is not flagged', () => {
    const s = ids(analyze({ channel: 'sms', text: 'Download our app from https://capitecbank.co.za/app' }))
    expect(s).not.toContain('typosquat')
    expect(s).not.toContain('lookalike')
  })
  it('look-alike letters from another alphabet (punycode) are flagged', () => {
    expect(ids(analyze({ channel: 'sms', text: 'Verify at https://xn--absa-9ua.co.za' }))).toContain('punycode')
  })
})

describe('images, QR codes and proof of payment', () => {
  it('a buyer’s “I have paid, here is the POP” is flagged', () => {
    const r = analyze({ channel: 'sms', from: '+27645551234', text: "Hi, I've paid R4,500 for the fridge. Proof of payment attached, my driver collects today." })
    expect(ids(r)).toContain('pop')
    expect(r.type).toBe('pop')
  })
  it('an edited slip pushes a POP to High', () => {
    const r = analyze({ channel: 'image', text: 'Payment notification R4,500.00 to Naledi', editScore: 0.84 })
    expect(r.level).toBe('high')
  })
  it('a QR code link is checked like any link', () => {
    const r = analyze({ channel: 'image', text: 'Scan to claim your grant', qrUrl: 'http://sassa-grant-apply.co.za/form' })
    expect(ids(r)).toContain('lookalike')
    expect(r.notes.join(' ')).toMatch(/QR code/)
  })
})

describe('scam waves', () => {
  it('matches a scam going around this week', () => {
    const waves = [{ id: 'sassa', name: 'Fake SASSA grant SMS', reports: 412, pattern: 'sassa|srd grant' }]
    expect(ids(analyze({ channel: 'sms', text: 'SASSA: your SRD grant is on hold.' }, { waves }))).toContain('wave')
  })
})
it('shows brand names in their usual form', () => { expect(analyze({ channel: 'sms', text: 'Apply at sassa-grant.co.za' }).signals.find(s => s.id === 'lookalike').text).toMatch(/SASSA/) })
