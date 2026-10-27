// Language detection and scam phrases in South Africa's official languages.
// The word and phrase lists live in ./lang/*.json so native speakers can review them without touching code.
// In the real app, speech-to-text and translation models do most of this; these lists are a lightweight fallback.
import en from './lang/en.json'
import af from './lang/af.json'
import zu from './lang/zu.json'
import xh from './lang/xh.json'
import st from './lang/st.json'
import tn from './lang/tn.json'
import nso from './lang/nso.json'
import ts from './lang/ts.json'
import ss from './lang/ss.json'
import ve from './lang/ve.json'
import nr from './lang/nr.json'

// Order matters: when two languages score the same, the first one wins.
export const LANGUAGES = [en, af, zu, xh, st, tn, nso, ts, ss, ve, nr]
export const LANG_NAMES = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]))
export const PHRASE_CATEGORIES = ['urgent', 'money', 'secret', 'otp', 'request', 'threat', 'prize', 'known', 'bank', 'police', 'verify']

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole-word match for any phrase in the list; letters on either side don't count as a match.
function phraseRegex(list) {
  if (!list.length) return /(?!)/
  return new RegExp('(?<![\\p{L}])(' + list.map(escapeRe).join('|') + ')(?![\\p{L}])', 'iu')
}

/** One regular expression per category, covering every language: ML.otp.test(text) */
export const ML = Object.fromEntries(PHRASE_CATEGORIES.map(c => [c, phraseRegex(LANGUAGES.flatMap(l => (l.phrases && l.phrases[c]) || []))]))

/** Guesses the language from common everyday words. Returns null for very short texts. */
export function detectLang(text) {
  const words = String(text || '').toLowerCase().replace(/[^\p{L}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean)
  if (words.length < 3) return null
  const sc = {}
  for (const l of LANGUAGES) { const set = new Set(l.words); sc[l.code] = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0) }
  const ranked = Object.entries(sc).sort((a, b) => b[1] - a[1])
  const [top, topScore] = ranked[0]
  if (topScore < 2) return { code: 'en', name: 'English', mixed: null, confidence: 'low' }
  const total = ranked.reduce((a, [, v]) => a + v, 0)
  let mixed = null
  if (top !== 'en' && sc.en >= 2) mixed = 'English'
  else if (top === 'en') {
    const second = ranked.find(([c, v]) => c !== 'en' && v >= 2)
    if (second) return { code: second[0], name: LANG_NAMES[second[0]], mixed: 'English', confidence: 'medium' }
  }
  return { code: top, name: LANG_NAMES[top], mixed, confidence: topScore / total > 0.6 ? 'high' : 'medium' }
}

export function langLabel(L) { return L ? L.name + (L.mixed ? ` + ${L.mixed} (mixed)` : '') : '' }
