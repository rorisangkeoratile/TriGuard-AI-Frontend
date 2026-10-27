// The one place the app talks to TriGuard's services. Two interchangeable implementations:
//   mock (default) - runs the local engine; services the phone can't do alone are simulated
//   api            - calls the TriGuard backend
// Choose with VITE_USE_MOCK=true|false and VITE_API_URL in .env (see .env.example).
//
// Privacy: the user's saved contacts and lists never leave the phone. The client looks the sender up locally and sends
// only the result of that lookup (`sender`), never the contact list itself. The family safe word is never sent.
import { analyze, hashString, hostOf, linkUrls, normalizeNumber } from '../engine/index.js'
import { DEMO_ACCOUNTS, DEMO_BLOCKLIST, DEMO_BREACHES, DEMO_WAVES, DEMO_NEW_WAVE } from './mockData.js'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * Result shape returned by every check (the engine's analyze() result). The backend must return the same shape:
 * {
 *   level: 'low'|'medium'|'high', score: 0..100, rule: string|null,
 *   signals: [{ id, pts, text, kind }], notes: string[], type: string, label: string, tips: string[],
 *   lang: { code, name, mixed, confidence } | null, num: string|null, trusted: string|null,
 *   origin: { kind, place, area, city, province, country, hidden, method, note } | null,
 *   reportsFrom: string|null, comm: { reports, weighted, type } | null
 * }
 */

const wait = ms => new Promise(r => setTimeout(r, ms))

/** What the phone knows about the sender, without sending any contact data. */
function senderLookup(ev, ctx) {
  const num = normalizeNumber(ev.from)
  if (!num) return null
  const trusted = ctx.findTrusted && ctx.findTrusted(num)
  const listed = ctx.findListed && ctx.findListed(num)
  return {
    trusted: trusted ? { name: trusted.name, org: trusted.org || null } : null,
    listed: listed ? { label: listed.label, note: listed.note || '' } : null,
  }
}

async function request(path, options) {
  let res
  try { res = await fetch(API_URL + path, options) }
  catch { throw new Error('Can’t reach the TriGuard server. Check that it is running and VITE_API_URL is correct.') }
  if (!res.ok) throw new Error(`The TriGuard server answered ${res.status}. Try again.`)
  return res.json()
}
const postJson = (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const getJson = path => request(path, { method: 'GET' })

/* ---------- demo simulations ---------- */

// A repeatable "AI score" from the file name. Names with fake/clone/edited score high, real/genuine score low.
function simulatedScore(name, size) {
  const n = name.toLowerCase(), h = hashString(name + size)
  if (/fake|clone|cloned|deepfake|edited|\bai\b|synth/.test(n)) return 0.82 + (h % 14) / 100
  if (/real|genuine|original/.test(n)) return 0.04 + (h % 8) / 100
  return (5 + (h % 90)) / 100
}

// Link reputation: known scam hosts are listed; hosts that copy a brand or use scam words are days old.
function simulatedLinkIntel(text) {
  return linkUrls(text).map(hostOf).map(host => {
    const h = hashString(host)
    if (DEMO_BLOCKLIST.includes(host)) return { host, listed: true, ageDays: 2 + (h % 6) }
    if (/\.(gov\.za|co\.za|com)$/.test(host) && !/-/.test(host)) return { host, ageDays: 900 + (h % 4000) }
    if (/verify|update|secure|refund|login|claim|apply|fee|grant|bonus/.test(host)) return { host, ageDays: 1 + (h % 20) }
    return { host, ageDays: 60 + (h % 2000) }
  })
}
const withIntel = ev => ({ ...ev, linkIntel: ev.linkIntel || simulatedLinkIntel([ev.text, ev.subject, ev.qrUrl].filter(Boolean).join(' ')) })

const mock = {
  /** Text events: SMS, email, pasted messages, finished calls. */
  async checkEvent(ev, ctx) { await wait(150); return analyze(withIntel(ev), ctx) },

  /** Voice notes ('audio') and video clips ('videoFile'). Returns the scores and the full result. */
  async checkMedia({ kind, file, name, size, meta }, ctx) {
    await wait(1300)
    const sc = simulatedScore(name || (file && file.name) || '', size || (file && file.size) || 0)
    const scores = kind === 'audio' ? { voiceScore: sc } : { faceScore: sc, lipsync: sc >= 0.7 }
    return { scores, result: analyze(withIntel({ ...meta, channel: kind, ...scores }), ctx) }
  },

  /** Screenshots, photos and slips. OCR isn't simulated: the user can type the text. QR codes are decoded on the phone. */
  async checkImage({ file, name, size, meta }, ctx) {
    await wait(1100)
    // Demo: slips and payment screenshots look edited unless the file name says real/genuine.
    const n = (name || (file && file.name) || '').toLowerCase()
    const looksLikeSlip = /pop|slip|proof|payment|edited|fake/.test(n) && !/real|genuine/.test(n)
    const editScore = looksLikeSlip ? 0.8 + (hashString(n + (size || 0)) % 15) / 100 : 0.05
    return { scores: { editScore }, result: analyze(withIntel({ ...meta, channel: 'image', editScore }), ctx) }
  },

  async checkNumber(num, ctx) { await wait(100); return analyze({ channel: 'call', from: num }, ctx) },

  async checkLink(url, ctx) { await wait(500); return analyze(withIntel({ channel: 'link', text: url }), ctx) },

  /** Reports are counted locally by the simulator in mock mode. */
  async reportNumber() { return { ok: true } },

  /**
   * Asks a contact, in their own TriGuard app, whether they are the one calling. The demo answers for them:
   * `simTruth` is the scenario's ground truth, which a real backend never has.
   */
  async verifyContact({ contactNumber, callerNumber, isUser, simTruth }) {
    await wait(2600)
    if (!isUser) return { answer: 'not-user' }
    return { answer: contactNumber === callerNumber && simTruth !== false ? 'yes' : 'no' }
  },

  async alertGuardian() { await wait(400); return { ok: true } },

  /** Video liveness challenge. The demo decides from the simulated face score. */
  async livenessCheck({ faceScore }) {
    await wait(4200)
    return (faceScore || 0) >= 0.4
      ? { result: 'fail', evidence: ['The outline of the face smeared when the head turned sideways.', 'When the hand crossed the face, the face showed through the fingers for 9 frames.'] }
      : { result: 'pass', evidence: ['The face kept its shape when the head turned.', 'The hand covered the face normally.'] }
  },

  async verifyBankAccount({ holder, account }) {
    await wait(1400)
    const digits = String(account || '').replace(/\D/g, '')
    const known = DEMO_ACCOUNTS[String(holder || '').trim().toLowerCase()]
    const nameMatch = !!known && known === digits
    return { exists: digits.length >= 8, nameMatch, olderThan3Months: nameMatch, holder }
  },

  async getScamWaves() { return DEMO_WAVES.map(w => ({ ...w })) },
  /** Demo control: a new scam wave appears. */
  async nextScamWave() { return { ...DEMO_NEW_WAVE } },

  async sendFeedback() { return { ok: true } },

  async checkBreaches(email) { await wait(900); return DEMO_BREACHES[String(email || '').toLowerCase()] || [] },
}

const api = {
  /** POST /v1/check/event  { event, sender }  ->  Result. The server adds link reputation, SIM-swap status and waves. */
  checkEvent(ev, ctx) {
    const { simTruth, ...event } = ev // demo-only ground truth, never sent
    return postJson('/v1/check/event', { event, sender: senderLookup(ev, ctx) })
  },

  /** POST /v1/check/media  multipart: file, kind, meta (JSON), sender (JSON)  ->  { scores, result } */
  checkMedia({ kind, file, meta }, ctx) {
    const form = new FormData()
    if (file) form.append('file', file)
    form.append('kind', kind)
    form.append('meta', JSON.stringify(meta || {}))
    form.append('sender', JSON.stringify(senderLookup(meta || {}, ctx)))
    return request('/v1/check/media', { method: 'POST', body: form })
  },

  /** POST /v1/check/image  multipart: file, meta (JSON, includes qrUrl decoded on the phone)  ->  { scores: { editScore }, result }. The server runs OCR. */
  checkImage({ file, meta }, ctx) {
    const form = new FormData()
    if (file) form.append('file', file)
    form.append('meta', JSON.stringify(meta || {}))
    form.append('sender', JSON.stringify(senderLookup(meta || {}, ctx)))
    return request('/v1/check/image', { method: 'POST', body: form })
  },

  /** POST /v1/check/number  { number, sender }  ->  Result */
  checkNumber(num, ctx) { return postJson('/v1/check/number', { number: num, sender: senderLookup({ from: num }, ctx) }) },

  /** POST /v1/check/link  { url }  ->  Result. The server checks threat lists and domain age and follows redirects in a sandbox. */
  checkLink(url) { return postJson('/v1/check/link', { url }) },

  /**
   * POST /v1/reports  { number, type, channel }  ->  { ok, reports }
   * The server decides how much the report counts (account age, linked devices, rate limits) and handles appeals.
   */
  reportNumber(report) { return postJson('/v1/reports', report) },

  /**
   * POST /v1/verify  { contactNumber, callerNumber }  ->  { id }
   * GET  /v1/verify/:id  ->  { answer: 'pending'|'yes'|'no'|'not-user'|'expired' }
   * The server pushes "Are you calling Naledi right now?" to the contact's app; they answer after unlocking it.
   */
  async verifyContact({ contactNumber, callerNumber }) {
    const { id } = await postJson('/v1/verify', { contactNumber, callerNumber })
    for (let i = 0; i < 30; i++) {
      await wait(2000)
      const r = await getJson(`/v1/verify/${encodeURIComponent(id)}`)
      if (r.answer !== 'pending') return r
    }
    return { answer: 'expired' }
  },

  /** POST /v1/guardian/alerts  { guardianNumber, reason }  ->  { ok }. Only sent after the user turned guardian alerts on. */
  alertGuardian(alert) { return postJson('/v1/guardian/alerts', alert) },

  /** POST /v1/liveness  { callId, frames: [base64 JPEG] }  ->  { result: 'pass'|'fail', evidence: string[] } */
  livenessCheck({ callId, frames }) { return postJson('/v1/liveness', { callId, frames: frames || [] }) },

  /** POST /v1/bank-accounts/verify  { holder, bank, account }  ->  { exists, nameMatch, olderThan3Months } (bank account verification service) */
  verifyBankAccount(details) { return postJson('/v1/bank-accounts/verify', details) },

  /** GET /v1/waves  ->  [{ id, name, reports, days, pattern, tip }] */
  getScamWaves() { return getJson('/v1/waves') },
  async nextScamWave() { return null },

  /** POST /v1/feedback  { eventId, level, userSays, channel, text }  ->  { ok }. Goes to the human review queue. */
  sendFeedback(fb) { return postJson('/v1/feedback', fb) },

  /** GET /v1/breaches?email=  ->  [{ name, date, data: string[] }] */
  checkBreaches(email) { return getJson(`/v1/breaches?email=${encodeURIComponent(email)}`) },
}

export const detector = USE_MOCK ? mock : api
