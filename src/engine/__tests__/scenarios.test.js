// Every demo scenario must get the verdict its `real` label says, with the demo user's saved contacts and community data.
import { describe, expect, it } from 'vitest'
import { analyze } from '../index.js'
import { SCENARIOS, SEED_TRUSTED, SEED_COMMUNITY } from '../../simulator/scenarios.js'

const ctx = {
  findTrusted: n => SEED_TRUSTED.find(t => t.num === n),
  findListed: () => undefined,
  findCommunity: n => SEED_COMMUNITY[n],
}
// A finished call is scored on its whole transcript, as the phone does when the call ends.
const asChecked = ev => (ev.transcript ? { ...ev, text: ev.transcript.join(' ') } : ev)

describe('demo scenarios', () => {
  for (const s of SCENARIOS.filter(x => x.ev)) {
    it(`${s.real ? 'real' : 'scam'}: ${s.title}`, () => {
      const r = analyze(asChecked(s.ev), ctx)
      if (s.real) expect(r.level).toBe('low')
      else expect(r.level).toBe(s.expect || 'high')
    })
  }

  it('scam split over several messages is High once read together', () => {
    const s = SCENARIOS.find(x => x.id === 'split')
    const last = s.multi[s.multi.length - 1]
    const r = analyze({ ...last, history: s.multi.slice(0, -1).map(m => m.text) }, ctx)
    expect(r.level).toBe('high')
    expect(r.signals.map(x => x.id)).toEqual(expect.arrayContaining(['otp', 'bankImp']))
    expect(r.notes.join(' ')).toMatch(/2 earlier messages/)
  })

  it('a number on the user’s own scam list is always High', () => {
    const r = analyze({ channel: 'call', from: '071 555 4402' }, { ...ctx, findListed: n => (n === '+27715554402' ? { num: n, label: 'scam' } : undefined) })
    expect(r.level).toBe('high')
  })

  it('never returns a "safe" level', () => {
    for (const s of SCENARIOS.filter(x => x.ev)) expect(['low', 'medium', 'high']).toContain(analyze(asChecked(s.ev), ctx).level)
  })
})
