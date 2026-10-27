import { describe, expect, it } from 'vitest'
import { detectLang, LANGUAGES, normalizeNumber, formatNumber, origin } from '../index.js'

describe('detectLang', () => {
  it.each([
    ['zu', 'Sawubona Mama, yimina. Ngilahlekelwe yifoni, le yinombolo yami entsha. Ngicela ungithumelele imali manje.'],
    ['af', 'Goeiemiddag, dis die bedrogafdeling. Lees asseblief vir my die kode wat ons nou gestuur het.'],
    ['xh', 'Molweni! Niphumelele i-R20,000. Thumelani i-OTP esiyithumele ngoku ukuze nifumane imali yenu namhlanje.'],
    ['st', 'Mme, ke nna. Ke kopa o nthomelle tjhelete hona jwale, ho potlakile.'],
    ['en', 'Hi, please call me when you are free. I have your parcel.'],
  ])('%s', (code, text) => {
    expect(detectLang(text).code).toBe(code)
  })

  it('spots isiZulu mixed with English', () => {
    const L = detectLang('Sawubona, this is the police. You must pay the fine manje ukuze ungaboshwa. Ungatsheli muntu ngalokhu, and please do it now.')
    expect(L.code).toBe('zu')
    expect(L.mixed).toBe('English')
  })

  it('returns null for very short text', () => {
    expect(detectLang('ok thanks')).toBeNull()
  })
})

describe('language files', () => {
  it('cover all 11 official languages', () => {
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(['af', 'en', 'nr', 'nso', 'ss', 'st', 'tn', 'ts', 've', 'xh', 'zu'])
  })
  it('mark each list as draft or reviewed', () => {
    for (const l of LANGUAGES) expect(['draft', 'reviewed']).toContain(l.status)
  })
})

describe('numbers', () => {
  it.each([
    ['082 555 0143', '+27825550143'],
    ['0027825550143', '+27825550143'],
    ['27825550143', '+27825550143'],
    ['+44 20 7946 0012', '+442079460012'],
    ['call me', null],
  ])('normalizes %s', (raw, want) => {
    expect(normalizeNumber(raw)).toBe(want)
  })
  it('formats SA numbers', () => {
    expect(formatNumber('+27825550143')).toBe('+27 82 555 0143')
  })
  it('shows the area for landlines but hides it for mobile and VoIP numbers', () => {
    expect(origin('+27105557720').city).toBe('Johannesburg')
    expect(origin('+27825550143').hidden).toBe(true)
    expect(origin('+27875553301').kind).toBe('Internet (VoIP) number')
  })
})
