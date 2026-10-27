// Tricks scammers use to slip past keyword filters.
import { describe, expect, it } from 'vitest'
import { analyze, prepareText } from '../index.js'

const ids = text => analyze({ channel: 'sms', from: '+27645550001', text }).signals.map(s => s.id)

describe('disguised OTP requests are still caught', () => {
  it.each([
    ['digit for a letter', 'Please send me the 0TP now'],
    ['spaced-out letters', 'Please read me the O T P'],
    ['dotted letters', 'Reply with the o.t.p we sent'],
    ['digit in PIN', 'Send your P1N to confirm'],
    ['lower-case L in PIN', 'Send your PlN to confirm'],
    ['Cyrillic о in OTP', 'Please send the оtp'],
    ['zero-width character', 'Please send the o​tp'],
  ])('%s', (_, text) => {
    expect(ids(text)).toContain('otp')
  })
})

describe('genuine OTP messages are not mistaken for requests', () => {
  it.each([
    'Your OTP is 123456. Do not share it with anyone.',
    'We will never ask for your PIN or password.',
    'Use one time pin 552210 to approve your purchase.',
  ])('%s', text => {
    expect(ids(text)).not.toContain('otp')
  })
})

describe('prepareText', () => {
  it('keeps amounts readable in the cleaned text', () => {
    expect(prepareText('Pay R5000 now').text).toBe('Pay R5000 now')
  })
  it('undoes leetspeak only inside words that mix letters and digits', () => {
    const { loose } = prepareText('urg3nt: pay R25 before 17:00')
    expect(loose).toContain('urgent')
    expect(loose).toContain('17:00')
  })
  it('keeps Tshivenda letters intact', () => {
    expect(prepareText('ni songo vhudza ṋamusi').text).toBe('ni songo vhudza ṋamusi')
  })
})

describe('reading messages together', () => {
  it('earlier messages from the same sender add their warning signs', () => {
    const alone = analyze({ channel: 'sms', from: '+27645550002', text: 'Send R500 to keep your account open.' })
    const together = analyze({ channel: 'sms', from: '+27645550002', text: 'Send R500 to keep your account open.', history: ['This is the Ubuntu Bank fraud department.'] })
    expect(together.signals.map(s => s.id)).toContain('bankImp')
    expect(together.score).toBeGreaterThan(alone.score)
  })
})

describe('links without http', () => {
  it('flags a bare shortened link', () => {
    expect(ids('Update your RICA details at bit.ly/rica-za')).toContain('shortlink')
  })
  it('ignores email addresses and file names', () => {
    const s = ids('Email accounts@karoosupplies.co.za about Invoice_4480.pdf')
    expect(s).not.toContain('lookalike')
    expect(s).not.toContain('http')
  })
})
