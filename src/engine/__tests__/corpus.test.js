// Messages modelled on real South African scams and genuine messages. Add new examples here as you collect them
// (remove personal details first). `min` is the lowest acceptable level for scams; genuine messages must stay Low.
import { describe, expect, it } from 'vitest'
import { analyze } from '../index.js'

const ORDER = { low: 0, medium: 1, high: 2 }

const SCAMS = [
  { min: 'high', ev: { channel: 'sms', from: '+27635559013', text: 'SARS: You have a tax refund of R3,450.20 pending. Verify your details to claim: http://sars-efiling-refund.co/claim' } },
  { min: 'high', ev: { channel: 'sms', from: '+27635551120', text: 'Your RICA registration is incomplete and your SIM will be blocked today. Update your details here: bit.ly/rica-update' } },
  { min: 'medium', ev: { channel: 'sms', from: '+27845550192', text: 'Capitec: Your account has been suspended due to suspicious activity. Call 087 555 1234 urgently.' } },
  { min: 'medium', ev: { channel: 'sms', from: '+27725550671', text: "Hi Ma, it's me. My phone is broken, this is my new number. Can you please EFT R1500 to this account urgently?" } },
  { min: 'medium', ev: { channel: 'message', msgType: 'whatsapp', text: 'Hello! Part-time job: earn R800 per day from home by liking YouTube videos. Reply YES to start.' } },
  { min: 'high', ev: { channel: 'call', from: '+27115550311', text: 'This is the FNB fraud team. Please read me the one time pin we just sent so we can stop the payment.' } },
  { min: 'high', ev: { channel: 'email', fromName: 'Ubuntu Bank', fromAddr: 'alerts@ubuntu-bank-secure.com', subject: 'Final notice', text: 'Your account is locked. Confirm your account details at ubuntu-bank-secure.com/login today.', auth: { spf: 'fail', dmarc: 'fail' } } },
  { min: 'high', ev: { channel: 'sms', from: '+27685550912', text: 'Sawubona, yimina. Ngicela ungithumelele i-OTP ofike manje.' } },
]

const GENUINE = [
  { channel: 'sms', fromName: 'Ubuntu Bank', text: 'Your Ubuntu Bank OTP is 482913. Never share this code with anyone, not even bank staff.' },
  { channel: 'sms', fromName: 'SwiftParcel', text: 'Your parcel will be delivered today between 9:00 and 13:00. Track it at https://swiftparcel.co.za/track/88421' },
  { channel: 'sms', from: '+27735550198', text: "Hi, it's Thabo. Running late, see you at 7." },
  { channel: 'sms', from: '+27825550143', text: 'Hallo my kind, ek is by die huis. Sien jou more.' },
  { channel: 'email', fromName: 'Karoo Supplies Accounts', fromAddr: 'accounts@karoosupplies.co.za', subject: 'Statement for October', text: 'Please find your October statement attached. Contact accounts@karoosupplies.co.za with any questions.', auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, attachments: ['Statement_October.pdf'] },
]

const ctx = { findTrusted: n => [{ name: 'Mom', num: '+27825550143' }, { name: 'Thabo', num: '+27735550198' }].find(t => t.num === n) }

describe('scam corpus', () => {
  SCAMS.forEach(({ min, ev }) => {
    it(`at least ${min}: ${(ev.subject || ev.text).slice(0, 60)}`, () => {
      const r = analyze(ev, ctx)
      expect(ORDER[r.level], `got ${r.level} (${r.score}): ${r.signals.map(s => s.id).join(', ')}`).toBeGreaterThanOrEqual(ORDER[min])
    })
  })
})

describe('genuine messages stay Low', () => {
  GENUINE.forEach(ev => {
    it((ev.subject || ev.text).slice(0, 60), () => {
      const r = analyze(ev, ctx)
      expect(r.level, `score ${r.score}: ${r.signals.map(s => s.id).join(', ')}`).toBe('low')
    })
  })
})
