// Demo mode: the API from docs/API.md, answered inside the browser so the app runs without the backend.
// Data lives in this browser's localStorage. Text checks run real rule checks; the voice models (AASIST, ECAPA,
// Whisper) and the malware scan need the backend, so voice-note results honestly report them as unavailable.
import { ApiError } from './client.js'
import { passwordProblem, pinProblem } from '../lib/format.js'
import { toB64url } from '../lib/device.js'
import { newSecret, otpauthUrl, verifyCode } from '../lib/totp.js'

// POPIA: passwords and PINs are kept only as salted one-way hashes, and no bank details or payment history are stored.
// Older versions of this store held bank account details, so they are deleted on load.
const KEY = 'triguard-demo-v3'
const now = () => new Date().toISOString()

function storage(fn) {
  try { return fn(localStorage) } catch { return null } // storage blocked: keep working in memory
}
storage(s => { s.removeItem('triguard-demo-v1'); s.removeItem('triguard-demo-v2') })

const fresh = () => ({
  seq: 1, orgs: [], users: [], contacts: [], checks: [], devices: [], sessions: [],
  salt: [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''),
})
// Read again on every request, so a device blocked in another tab takes effect here straight away.
let db = null
function load() {
  const stored = storage(s => JSON.parse(s.getItem(KEY)))
  if (!stored) return db || fresh()
  const { session: _old, ...rest } = stored // older demo data had one shared session
  return { devices: [], sessions: [], ...rest }
}
db = load()
const save = () => storage(s => s.setItem(KEY, JSON.stringify(db)))
const nextId = () => db.seq++
const randomToken = () => toB64url(crypto.getRandomValues(new Uint8Array(32)))

// Each browser tab has its own session, like each phone or computer would with the real backend.
// That lets one tab block a device that is signed in on another tab.
const TAB_KEY = 'triguard-demo-session'
let memoryTab = null
function tabToken() {
  try { return sessionStorage.getItem(TAB_KEY) } catch { return memoryTab }
}
function setTab(token) {
  memoryTab = token
  try { token ? sessionStorage.setItem(TAB_KEY, token) : sessionStorage.removeItem(TAB_KEY) } catch { /* memory only */ }
}
// For tests: switch between two signed-in "devices".
export const demoSession = { get: tabToken, set: setTab }

async function hash(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${db.salt}:${text}`))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

const fail = (status, detail) => { throw new ApiError(detail, status) }
const wait = ms => new Promise(r => setTimeout(r, ms))

// ---------- sessions and approved devices ----------
const PIN_TRIES = 5
const RESET_MINUTES = 30
const OTP_TRIES = 5 // wrong sign-in codes before the login attempt is cancelled
const OTP_MINUTES = 5 // time to type the code after the password
// Sessions (OWASP session management): signed out after 15 minutes without activity, so an unattended till or
// office computer can't be used to release payments, and after 8 hours (one shift) even when active.
export const IDLE_MINUTES = 15
export const MAX_SESSION_HOURS = 8

async function setPassword(user, password) {
  user.password = await hash(`password:${user.email}:${password}`)
  user.must_change_password = false
}
const SIGNED_OUT = {
  device_blocked: 'You were signed out because this device was blocked. If it was lost or stolen, it can’t open TriGuard any more.',
  removed: 'You were signed out because your account was removed from this store.',
  password_changed: 'You were signed out because your password was changed. Log in with the new password.',
  idle: `You were signed out after ${IDLE_MINUTES} minutes without activity, so nobody can use TriGuard on an unattended computer. Log in again.`,
  expired: `Your session ended after ${MAX_SESSION_HOURS} hours. Log in again to carry on.`,
}

const currentSession = () => { const t = tabToken(); return t ? db.sessions.find(s => s.token === t) : null }

function endSession(session) {
  db.sessions = db.sessions.filter(s => s !== session)
  if (session && session.token === tabToken()) setTab(null)
  save()
}

// A session only works while its device is approved, so blocking a device signs it out.
function me() {
  const s = currentSession()
  if (s && !s.revoked) {
    if (Date.now() - Date.parse(s.created_at) > MAX_SESSION_HOURS * 3600000) s.revoked = 'expired'
    else if (Date.now() - (s.last_active || Date.parse(s.created_at)) > IDLE_MINUTES * 60000) s.revoked = 'idle'
  }
  if (s?.revoked) { endSession(s); fail(401, SIGNED_OUT[s.revoked]) }
  const user = s && db.users.find(u => u.id === s.user_id && u.active)
  if (!user) fail(401, 'Please log in.')
  const device = db.devices.find(d => d.id === s.device_id)
  if (device?.status !== 'approved') { endSession(s); fail(401, SIGNED_OUT.device_blocked) }
  return user
}

const devicesOf = user => db.devices.filter(d => d.user_id === user.id)

const deviceOut = d => ({
  id: d.id, name: d.name, status: d.status, user_id: d.user_id, user_name: userName(d.user_id),
  current: currentSession()?.device_id === d.id,
  created_at: d.created_at, approved_at: d.approved_at, last_used_at: d.last_used_at, blocked_at: d.blocked_at,
})

// Each browser keeps a random device key (src/lib/device.js); only its hash is stored. A device seen for the
// first time is registered: a store owner's first device is approved straight away, every other device waits
// until the owner approves it. Only an approved device gets a session.
async function signIn(user, deviceKey, deviceName) {
  if (!deviceKey) fail(400, 'This device couldn’t be identified. Please reload the page and try again.')
  const keyHash = await hash(`device:${deviceKey}`)
  let device = devicesOf(user).find(d => d.key_hash === keyHash)
  if (!device) {
    const first = user.role === 'owner' && devicesOf(user).length === 0
    device = {
      id: nextId(), org_id: user.org_id, user_id: user.id, key_hash: keyHash,
      name: String(deviceName || '').trim().slice(0, 60) || 'Unnamed device',
      status: first ? 'approved' : 'pending',
      created_at: now(), approved_at: first ? now() : null, approved_by: first ? user.id : null, last_used_at: null, blocked_at: null,
    }
    db.devices.push(device)
  }
  if (device.status === 'blocked') { save(); fail(403, 'This device has been blocked, so it can’t open TriGuard. Ask your store owner for help.') }
  if (device.status === 'pending') { save(); return { step: 'pending', device: deviceOut(device) } }

  const old = currentSession()
  if (old) db.sessions = db.sessions.filter(s => s !== old)
  const session = { token: randomToken(), user_id: user.id, device_id: device.id, created_at: now(), last_active: Date.now() }
  db.sessions.push(session)
  setTab(session.token)
  device.last_used_at = now()
  save()
  return { step: 'done', user: meOut(user) }
}

const userOut = u => ({
  id: u.id, full_name: u.full_name, email: u.email, role: u.role,
  company: db.orgs.find(o => o.id === u.org_id)?.name || '', created_at: u.created_at,
})

function meOut(u) {
  const device = db.devices.find(d => d.id === currentSession()?.device_id)
  return {
    ...userOut(u),
    device: device ? deviceOut(device) : null,
    has_pin: !!u.pin,
    has_totp: !!u.totp,
    pin_locked: (u.pin_failures || 0) >= PIN_TRIES,
    pending_devices: u.role === 'owner' ? db.devices.filter(d => d.org_id === u.org_id && d.status === 'pending').length : 0,
    must_change_password: !!u.must_change_password,
  }
}
const contactOut = c => ({ id: c.id, name: c.name, role_title: c.role_title, phone: c.phone, has_voiceprint: !!c.voiceprint, created_at: c.created_at })
const userName = id => db.users.find(u => u.id === id)?.full_name || null

// ---------- the words guard (same rules the backend uses) ----------
const RULES = [
  ['credentials', 40, /\b(otp|one[- ]?time pin|pin|password|passcode|verification code|login details)\b/, 'Asks for a PIN, OTP or password. No real boss, supplier or bank needs these.'],
  ['bank_change', 30, /\b(new|changed|updated|different|another)\s+(bank(ing)?\s+)?(account|details|banking details)\b|\bbank(ing)? details (have )?changed\b|\bnuwe rekening\b/, 'Says the bank details have changed. Changed banking details are the most common payment-fraud trick.'],
  ['secrecy', 20, /\b(don'?t|do not) (tell|mention|call|phone)\b|\bkeep (this|it) (confidential|quiet|between us|secret)\b|\bconfidential\b|\bbetween us\b|\bungatsheli\b/, 'Asks you to keep it secret or not to call. That stops you from checking.'],
  ['unreachable', 15, /\b(in a meeting|can'?t talk|cannot talk|can'?t take calls|no signal|lost my phone|new number)\b/, 'Says they can’t take a call right now. Scammers say this so you won’t call back.'],
  ['urgency', 15, /\b(urgent(ly)?|asap|immediately|right now|right away|today|before \d|within the hour|end of day|dringend|nou dadelik|ngokushesha|manje)\b/, 'Puts you under time pressure. Real requests can wait the two minutes a call-back takes.'],
  ['payment_request', 15, /\b(pay|payment|transfer|eft|deposit|send (the )?money|process (the )?payment|settle|betaal|khokha)\b/, 'Asks for a payment or transfer.'],
  ['authority', 10, /\b(ceo|cfo|director|the boss|your boss|it'?s me|this is your manager|head office|area manager|regional manager|store owner|franchise owner)\b/, 'Leans on the authority of the owner, head office or a manager.'],
  ['new_supplier', 10, /\b(new supplier|new vendor|new service provider|new rep|new driver)\b/, 'Pays a new supplier you haven’t paid before.'],
  ['untraceable', 25, /\b(gift ?cards?|vouchers?|airtime|data bundles?|prepaid electricity|bitcoin|crypto|ewallet|cash send|instant money)\b/, 'Asks for airtime, vouchers, eWallet or crypto, which can’t be reversed.'],
  // Retail: cash taken straight from the store.
  ['till_cash', 25, /\b(from the till|till money|cash[- ]?up|the float|from the safe|petty cash|banking bag|cash deposit)\b/, 'Asks for cash from the till, float or safe. Owners and head office don’t collect store cash by voice note or SMS.'],
  // The Arup pattern: "let's confirm on a call" with a meeting the requester controls.
  ['meeting_link', 20, /teams\.microsoft\.com|teams\.live\.com|zoom\.us\/(j|my)\/|meet\.google\.com\/|\b(teams|zoom|google meet) (call|meeting)\b|\bvideo (call|conference|meeting)\b/, 'Wants to confirm over a video call it set up. Deepfakes can copy a face and voice live on a call, so that isn’t proof. Call back on the saved number instead.'],
  ['stock_delivery', 15, /\b(stock delivery|delivery fee|cash on delivery|cod|pay the driver|release the stock)\b/, 'Ties the payment to a stock delivery. Fake suppliers use urgent deliveries to rush payments.'],
]

const status = (state, detail) => ({ status: state, detail })

// The payment check: staff answer three yes/no questions; each "yes" raises the risk.
// No amounts, payee names, bank account numbers or payment history are collected (POPIA section 10).
const PAYMENT_RULES = [
  ['new_payee_or_bank_change', 30, 'You said it’s a new supplier or the bank details have changed. That’s the most common payment-fraud trick.'],
  ['larger_than_usual', 15, 'You said it’s bigger than the payments you normally make.'],
  ['skip_approval', 25, 'You were asked to skip the normal approval. Scammers do this so nobody else can check.'],
]

const readAnswer = v => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null)

// Voice notes are the one check demo mode can't do in the browser: the AI-voice model and transcription run on the
// TriGuard backend (POST /api/v1/voice/analyze, through Vite's /api proxy). The audio is analysed in memory there
// and not stored. Tries twice, then returns null.
// The deployed site has no Vite proxy, so it calls the backend at VITE_API_URL directly (allowed by its CORS list).
const VOICE_API = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') : ''
const LANGUAGE_NAMES = { en: 'English', zu: 'isiZulu', af: 'Afrikaans' }
async function serverVoice(file, audioLanguage) {
  if (!(file instanceof Blob)) return null
  const form = new FormData()
  form.append('file', file)
  form.append('language', 'en') // results and translations in English
  if (LANGUAGE_NAMES[audioLanguage]) form.append('audio_language', audioLanguage)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(VOICE_API + '/api/v1/voice/analyze', { method: 'POST', body: form })
      if (res.ok) return await res.json()
      const data = await res.json().catch(() => null)
      // A file the server can't read won't work on a second try either.
      if (res.status < 500) fail(422, typeof data?.detail === 'string' ? data.detail : 'TriGuard couldn’t read this voice note.')
    } catch (err) {
      if (err instanceof ApiError) throw err
    }
  }
  return null
}

function voiceSignal(score) {
  const pct = Math.round(score * 100)
  if (score >= 0.7) return { id: 'voice_clone', points: 45, guard: 'voice', text: `The voice shows strong signs of AI cloning (${pct}%).` }
  if (score >= 0.4) return { id: 'voice_clone', points: 20, guard: 'voice', text: `The voice shows some signs of AI generation (${pct}%).` }
  return { id: 'voice_clone', points: 0, guard: 'voice', text: `The AI-voice detector found no strong signs of cloning (${pct}%). New cloning tools can still slip through.` }
}

function assess({ text, contact, senderNumber, answers, voiceScore = null }) {
  const signals = typeof voiceScore === 'number' ? [voiceSignal(voiceScore)] : []
  if (contact && senderNumber) {
    signals.push(senderNumber !== contact.phone
      ? { id: 'number_mismatch', points: 20, guard: 'words', text: `It came from ${senderNumber}, not ${contact.name}’s saved number.` }
      : { id: 'number_match', points: 0, guard: 'words', text: `It came from ${contact.name}’s saved number. A stolen phone or swapped SIM can still send from it.` })
  }
  const lowered = (text || '').toLowerCase()
  for (const [id, points, rx, why] of RULES) if (rx.test(lowered)) signals.push({ id, points, guard: 'words', text: why })

  const answered = PAYMENT_RULES.filter(([key]) => answers[key] !== null)
  for (const [key, points, why] of PAYMENT_RULES) {
    if (answers[key] === true) signals.push({ id: key, points, guard: 'payment', text: why })
  }
  const yeses = PAYMENT_RULES.filter(([key]) => answers[key] === true).length
  const payment = answered.length
    ? status('ran', `${answered.length} of 3 payment questions answered, ${yeses} “yes”.`)
    : status('skipped', 'The payment questions weren’t answered.')

  let score = Math.min(100, signals.reduce((s, x) => s + x.points, 0))
  const ids = new Set(signals.map(s => s.id))
  // Some combinations are High on their own.
  const cloned = signals.some(s => s.id === 'voice_clone' && s.points >= 45)
  if (cloned || ids.has('credentials') || (ids.has('new_payee_or_bank_change') && ids.has('skip_approval'))) score = Math.max(score, 60)
  signals.sort((a, b) => b.points - a.points)
  return { signals, score, level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low', payment }
}

function explanation(level, signals, who) {
  const opening = {
    high: 'High risk. Treat this as a scam until you’ve checked it.',
    medium: 'Medium risk. Some things don’t add up, so check before you act.',
    low: 'Low risk. We didn’t find warning signs, but that doesn’t prove it’s genuine.',
  }[level]
  const reasons = signals.filter(s => s.points > 0).slice(0, 2).map(s => s.text).join(' ')
  return `${opening}${reasons ? ' ' + reasons : ''} Before you pay, call ${who} back on the number saved in TriGuard, not the number the message came from.`
}

function checkOut(c) {
  const contact = db.contacts.find(x => x.id === c.claimed_contact_id)
  const { org_id: _org, ...visible } = c
  return {
    ...visible,
    claimed_contact: contact ? contactOut(contact) : null,
    callback_by_name: userName(c.callback_by),
    decided_by_name: userName(c.decided_by),
    created_by_name: userName(c.created_by) || '',
  }
}

function summaryOut(c) {
  const contact = db.contacts.find(x => x.id === c.claimed_contact_id)
  const top = c.signals.find(s => s.points > 0)
  return {
    id: c.id, kind: c.kind, sender: contact ? contact.name : c.sender_number || 'Unknown sender',
    level: c.level, score: c.score, headline: c.content ? c.content.slice(0, 120) : top ? top.text : 'Voice note',
    callback_status: c.callback_status, decision: c.decision, created_at: c.created_at,
  }
}

function createCheck(user, kind, fields, server = null) {
  const contactId = fields.claimed_contact_id ? Number(fields.claimed_contact_id) : null
  const contact = contactId ? db.contacts.find(x => x.id === contactId && x.org_id === user.org_id) : null
  if (contactId && !contact) fail(422, 'That trusted contact doesn’t exist.')
  const transcript = (server?.transcript || '').trim()
  const text = kind === 'text' ? String(fields.text || '').trim() : transcript
  const answers = Object.fromEntries(PAYMENT_RULES.map(([key]) => [key, readAnswer(fields[key])]))
  const model = server?.model?.available ? server.model : null
  const voiceScore = typeof model?.synthetic_probability === 'number' ? model.synthetic_probability : null

  // The scam-script rules are mostly English, so also run them on the English translation of a local-language note.
  const checked = [text, server?.transcript_english].filter(Boolean).join('\n')
  const result = assess({ text: checked, contact, senderNumber: fields.sender_number || '', answers, voiceScore })
  // The server also reads the transcript in all 11 languages; use that when the English rules found nothing.
  const tr = server?.transcript_risk
  if (tr && ['high', 'critical'].includes(tr.risk_level) && !result.signals.some(s => s.guard === 'words' && s.points > 0)) {
    result.signals.push({ id: 'ai_words', points: 30, guard: 'words', text: tr.headline })
    result.score = Math.min(100, result.score + 30)
    result.level = result.score >= 60 ? 'high' : result.score >= 30 ? 'medium' : 'low'
  }
  const needsServer = 'Needs the TriGuard server (demo mode).'
  const guards = kind === 'voice'
    ? {
        voice_clone: voiceScore !== null
          ? status('ran', `AI-voice detector (wav2vec2 deepfake model) on the TriGuard server: ${Math.round(voiceScore * 100)}% likely AI. The audio wasn’t stored.`)
          : status('unavailable', `AI-voice detection: ${server?.model?.note || needsServer}`),
        voice_match: contact?.voiceprint
          ? status('unavailable', `Voiceprint match (ECAPA): ${needsServer}`)
          : status('skipped', 'No saved voiceprint for the person it claims to be from.'),
        transcription: transcript
          ? status('ran', `Transcribed on the TriGuard server${server.transcript_engine ? ` (${server.transcript_engine})` : ''}, then checked for the payment-fraud script.`)
          : status('unavailable', `Transcription: ${server ? 'No speech could be transcribed.' : needsServer} The words in the voice note weren’t checked.`),
        words: status('ran', transcript ? 'Checked the sender details and the words in the voice note.' : 'Checked the sender details.'),
        payment: result.payment,
        file_safety: status('unavailable', `Malware scan (ClamAV): ${needsServer}`),
      }
    : {
        words: status('ran', 'Checked the message for the payment-fraud script.'),
        payment: result.payment,
      }

  const who = contact ? contact.name : 'the person'
  const check = {
    id: nextId(), org_id: user.org_id, created_by: user.id, kind,
    claimed_contact_id: contact ? contact.id : null,
    source: fields.source === 'outlook' ? 'outlook' : null,
    sender_number: fields.sender_number || '', content: text,
    content_english: server?.transcript_english || '',
    language: server ? LANGUAGE_NAMES[server.audio_language] || server.audio_language || '' : (text ? 'Not detected in demo mode' : ''),
    payment_answers: answers,
    level: result.level, score: result.score, signals: result.signals, guards,
    voice_score: voiceScore, speaker_similarity: null,
    explanation: explanation(result.level, result.signals, who)
      + (kind === 'voice' && voiceScore === null ? ' The voice itself could not be analysed: the TriGuard server isn’t running.' : ''),
    callback_status: 'pending', callback_note: '', callback_at: null, callback_by: null,
    decision: 'none', decided_at: null, decided_by: null, created_at: now(),
  }
  db.checks.push(check)
  save()
  return checkOut(check)
}

const findCheck = (user, id) => db.checks.find(c => c.id === Number(id) && c.org_id === user.org_id) || fail(404, 'This check doesn’t exist.')
const findContact = (user, id) => db.contacts.find(c => c.id === Number(id) && c.org_id === user.org_id) || fail(404, 'Not found.')
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString() }

// ---------- request router ----------
export async function demoRequest(path, method, json, form) {
  await wait(250)
  db = load()
  const [route, query = ''] = path.split('?')
  const parts = route.split('/').filter(Boolean)
  const body = json || (form ? Object.fromEntries(form.entries()) : {})

  // Demo mode accepts any details for a NEW account: any email, any password, even blanks; logging in with a
  // new email creates the account on the spot. An existing account still needs the password it was created with,
  // so nobody else at this computer can open someone's contacts, messages and payments (POPIA section 19).
  if ((route === '/auth/register' || route === '/auth/login') && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase() || 'demo@triguard.local'
    const password = await hash(`password:${email}:${body.password || ''}`)
    let user = db.users.find(u => u.email === email && u.active)
    if (user && user.password !== password) {
      fail(401, route === '/auth/register'
        ? 'An account with this email already exists in this browser. Log in with its password, or use another email.'
        : 'That email and password don’t match.')
    }
    if (!user) {
      const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Demo User'
      const org = { id: nextId(), name: String(body.company || '').trim() || 'My Store' }
      user = { id: nextId(), org_id: org.id, full_name: String(body.full_name || '').trim() || fallbackName, email, password, role: 'owner', active: true, created_at: now() }
      db.orgs.push(org)
      db.users.push(user)
    }
    // With sign-in codes on, the right password isn't enough: the code from the authenticator app comes next.
    if (user.totp) {
      db.challenges = (db.challenges || []).filter(c => c.expires > Date.now() && c.user_id !== user.id)
      const challenge = { token: randomToken(), user_id: user.id, device_key: body.device_key, device_name: body.device_name, tries: 0, expires: Date.now() + OTP_MINUTES * 60000 }
      db.challenges.push(challenge)
      save()
      return { step: 'otp', challenge: challenge.token }
    }
    return signIn(user, body.device_key, body.device_name)
  }
  if (route === '/auth/login/otp' && method === 'POST') {
    const challenge = (db.challenges || []).find(c => c.token === body.challenge && c.expires > Date.now())
    const user = challenge && db.users.find(u => u.id === challenge.user_id && u.active)
    if (!challenge || !user?.totp) fail(401, 'This sign-in has expired. Log in again.')
    const step = await verifyCode(user.totp.secret, String(body.code || '').trim(), user.totp.last_step)
    if (step === null) {
      challenge.tries += 1
      if (challenge.tries >= OTP_TRIES) {
        db.challenges = db.challenges.filter(c => c !== challenge)
        save()
        fail(429, 'Too many wrong codes. Log in again with your password.')
      }
      save()
      fail(401, `That code isn’t right. Check the TriGuard AI code in your authenticator app (${OTP_TRIES - challenge.tries} ${OTP_TRIES - challenge.tries === 1 ? 'try' : 'tries'} left).`)
    }
    user.totp.last_step = step // each code works once
    db.challenges = db.challenges.filter(c => c !== challenge)
    return signIn(user, challenge.device_key, challenge.device_name)
  }
  if (route === '/auth/logout') { endSession(currentSession()); return null }
  if (route === '/auth/me') {
    const u = me()
    // The app re-checks /auth/me every few seconds; only count it as activity when the person actually used the page.
    if (new URLSearchParams(query).get('active') === '1') { currentSession().last_active = Date.now(); save() }
    return meOut(u)
  }

  // Forgotten password. Store owners get a one-time reset link by email; staff ask their store owner.
  // The answer is the same whether or not the email exists, so it can't be used to find accounts.
  if (route === '/auth/forgot' && method === 'POST') {
    const owner = db.users.find(u => u.email === String(body.email || '').trim().toLowerCase() && u.active && u.role === 'owner')
    const result = { sent: true }
    if (owner) {
      const token = randomToken()
      owner.reset = { hash: await hash(`reset:${token}`), expires: Date.now() + RESET_MINUTES * 60000 }
      save()
      result.demo_reset_token = token // demo mode can't send email, so the page shows the link instead
    }
    return result
  }
  if (route === '/auth/reset' && method === 'POST') {
    const tokenHash = await hash(`reset:${body.token || ''}`)
    const u = db.users.find(x => x.active && x.reset?.hash === tokenHash)
    if (!u || u.reset.expires < Date.now()) fail(400, 'This reset link has expired or was already used. Ask for a new one.')
    const problem = passwordProblem(String(body.new_password || ''))
    if (problem) fail(422, problem)
    await setPassword(u, body.new_password)
    u.reset = null
    for (const s of db.sessions) if (s.user_id === u.id) s.revoked = 'password_changed'
    save()
    return { ok: true }
  }

  const user = me()
  const orgId = user.org_id
  currentSession().last_active = Date.now() // any real action counts as activity
  save()

  // Everyone can change their own password. Staff must replace the temporary one the owner gave them first.
  if (route === '/auth/password' && method === 'PUT') {
    if (await hash(`password:${user.email}:${body.current_password || ''}`) !== user.password) fail(403, 'Your current password is wrong.')
    const problem = passwordProblem(String(body.new_password || ''))
    if (problem) fail(422, problem)
    if (body.new_password === body.current_password) fail(422, 'Choose a password that’s different from the current one.')
    await setPassword(user, body.new_password)
    // Sign out everywhere else, in case someone else knew the old password.
    const mine = currentSession()
    for (const s of db.sessions) if (s.user_id === user.id && s !== mine) s.revoked = 'password_changed'
    save()
    return meOut(user)
  }
  if (user.must_change_password) fail(403, 'Change your temporary password first.')

  // The payment PIN. Setting or changing it needs the account password; it's stored only as a hash.
  if (route === '/auth/pin' && method === 'PUT') {
    if (await hash(`password:${user.email}:${body.password || ''}`) !== user.password) fail(403, 'That password is wrong.')
    const problem = pinProblem(body.pin)
    if (problem) fail(422, problem)
    user.pin = await hash(`pin:${user.id}:${body.pin}`)
    user.pin_failures = 0
    save()
    return meOut(user)
  }

  // Sign-in codes (two-step sign-in). Turning them on or off needs the password; turning on also needs a first code,
  // which proves the authenticator app was set up correctly before the account depends on it.
  if (parts[0] === 'auth' && parts[1] === 'totp' && method === 'POST') {
    const passwordOk = async () => await hash(`password:${user.email}:${body.password || ''}`) === user.password
    if (parts[2] === 'setup') {
      if (!(await passwordOk())) fail(403, 'That password is wrong.')
      user.totp_pending = newSecret()
      save()
      return { secret: user.totp_pending, otpauth_url: otpauthUrl(user.totp_pending, user.email) }
    }
    if (parts[2] === 'enable') {
      if (!user.totp_pending) fail(409, 'Start the set-up again.')
      const step = await verifyCode(user.totp_pending, String(body.code || '').trim())
      if (step === null) fail(422, 'That code isn’t right. Type the 6-digit code shown for TriGuard AI in your authenticator app.')
      user.totp = { secret: user.totp_pending, last_step: step, enabled_at: now() }
      user.totp_pending = null
      save()
      return meOut(user)
    }
    if (parts[2] === 'disable') {
      if (!(await passwordOk())) fail(403, 'That password is wrong.')
      user.totp = null
      save()
      return meOut(user)
    }
  }

  if (parts[0] === 'devices') {
    const isOwner = user.role === 'owner'
    if (parts.length === 1 && method === 'GET') {
      const order = { pending: 0, approved: 1, blocked: 2 }
      return db.devices
        .filter(d => (isOwner ? d.org_id === orgId : d.user_id === user.id))
        .sort((a, b) => order[a.status] - order[b.status] || b.created_at.localeCompare(a.created_at))
        .map(deviceOut)
    }
    const d = db.devices.find(x => x.id === Number(parts[1]) && x.org_id === orgId && (isOwner || x.user_id === user.id)) || fail(404, 'Not found.')
    if (parts[2] === 'approve' && method === 'POST') {
      if (!isOwner) fail(403, 'Only the store owner can approve devices.')
      if (d.status !== 'pending') fail(409, d.status === 'blocked' ? 'A blocked device can’t be approved again. Set it up as a new device.' : 'This device is already approved.')
      Object.assign(d, { status: 'approved', approved_at: now(), approved_by: user.id })
      save()
      return deviceOut(d)
    }
    // Lost or stolen: the device is signed out within seconds and can't log in again.
    if (parts[2] === 'block' && method === 'POST') {
      if (d.id === currentSession()?.device_id) fail(400, 'You’re using this device. Block it from another approved device, or ask the store owner.')
      if (d.status !== 'blocked') {
        Object.assign(d, { status: 'blocked', blocked_at: now(), blocked_by: user.id })
        for (const s of db.sessions) if (s.device_id === d.id) s.revoked = 'device_blocked'
        save()
      }
      return deviceOut(d)
    }
  }

  if (parts[0] === 'team') {
    if (method === 'GET') return db.users.filter(u => u.org_id === orgId && u.active).map(userOut)
    if (user.role !== 'owner') fail(403, 'Only the store owner can do this.')
    if (method === 'POST') {
      const email = String(body.email).toLowerCase()
      if (db.users.some(u => u.email === email)) fail(409, 'Someone already uses this email.')
      const staff = {
        id: nextId(), org_id: orgId, full_name: body.full_name, email, role: 'staff', active: true, created_at: now(),
        password: await hash(`password:${email}:${body.password || ''}`), must_change_password: true,
      }
      db.users.push(staff)
      save()
      return userOut(staff)
    }
    // The owner gives a staff member who forgot their password a new temporary one.
    if (parts[2] === 'password' && method === 'PUT') {
      const staff = db.users.find(u => u.id === Number(parts[1]) && u.org_id === orgId && u.active) || fail(404, 'Not found.')
      if (staff.role === 'owner') fail(400, 'Change your own password under Security.')
      const problem = passwordProblem(String(body.password || ''))
      if (problem) fail(422, problem)
      await setPassword(staff, body.password)
      staff.must_change_password = true
      staff.totp = null // lost phone: they set up sign-in codes again on the new one
      for (const s of db.sessions) if (s.user_id === staff.id) s.revoked = 'password_changed'
      save()
      return userOut(staff)
    }
    if (method === 'DELETE') {
      const staff = db.users.find(u => u.id === Number(parts[1]) && u.org_id === orgId) || fail(404, 'Not found.')
      if (staff.role === 'owner') fail(400, 'The owner account can’t be removed.')
      staff.active = false
      for (const d of devicesOf(staff)) if (d.status !== 'blocked') Object.assign(d, { status: 'blocked', blocked_at: now(), blocked_by: user.id })
      for (const s of db.sessions) if (s.user_id === staff.id) s.revoked = 'removed'
      save()
      return null
    }
  }

  if (parts[0] === 'contacts') {
    if (parts.length === 1 && method === 'GET') return db.contacts.filter(c => c.org_id === orgId).map(contactOut)
    // Call-backs only protect the store if nobody else can swap a contact's number, so only the owner edits contacts.
    if (user.role !== 'owner') fail(403, 'Only the store owner can add, change or remove trusted contacts.')
    if (parts.length === 1 && method === 'POST') {
      const c = { id: nextId(), org_id: orgId, name: body.name, role_title: body.role_title || '', phone: body.phone, voiceprint: false, created_at: now() }
      db.contacts.push(c)
      save()
      return contactOut(c)
    }
    const c = findContact(user, parts[1])
    if (parts[2] === 'voiceprint') {
      if (method === 'POST') fail(503, 'Saving a voiceprint needs the TriGuard server, which runs the voice model. This works once the backend is connected.')
      c.voiceprint = false
      save()
      return null
    }
    if (method === 'DELETE') {
      db.contacts = db.contacts.filter(x => x !== c)
      save()
      return null
    }
  }

  if (parts[0] === 'checks') {
    if (route === '/checks/voice' && method === 'POST') {
      const server = await serverVoice(body.file, body.audio_language)
      // Never save a "Low risk" result for a voice nobody analysed.
      if (!server) fail(503, 'Couldn’t reach the TriGuard server to check the voice, so nothing was saved. Check your internet connection, keep this page open, and try again.')
      db = load() // the server check takes a while; pick up changes made meanwhile
      return createCheck(user, 'voice', body, server)
    }
    if (route === '/checks/text' && method === 'POST') return createCheck(user, 'text', body)
    if (parts.length === 1 && method === 'GET') {
      const q = new URLSearchParams(query)
      let rows = db.checks.filter(c => c.org_id === orgId).sort((a, b) => b.created_at.localeCompare(a.created_at))
      if (q.get('level')) rows = rows.filter(c => c.level === q.get('level'))
      if (q.get('callback')) rows = rows.filter(c => c.callback_status === q.get('callback'))
      const offset = Number(q.get('offset')) || 0
      const limit = Number(q.get('limit')) || 20
      return { items: rows.slice(offset, offset + limit).map(summaryOut), total: rows.length }
    }
    const c = findCheck(user, parts[1])
    if (parts.length === 2 && method === 'GET') return checkOut(c)
    if (parts[2] === 'callback' && method === 'POST') {
      if (c.decision !== 'none') fail(409, 'A decision has already been made on this check.')
      Object.assign(c, { callback_status: body.outcome, callback_note: body.note || '', callback_at: now(), callback_by: user.id })
      save()
      return checkOut(c)
    }
    if (parts[2] === 'decision' && method === 'POST') {
      if (c.decision !== 'none') fail(409, 'A decision has already been made on this check.')
      if (body.action === 'released') {
        if (c.callback_status !== 'confirmed') fail(409, 'No call-back, no payment: confirm with the person on their saved number first.')
        // Every release needs the payment PIN, so someone holding an unlocked phone still can't release a payment.
        if (!user.pin) fail(403, 'Set your payment PIN under Security before you release payments.')
        if ((user.pin_failures || 0) >= PIN_TRIES) fail(423, 'Your payment PIN is locked after too many wrong tries. Set a new one under Security.')
        if (await hash(`pin:${user.id}:${body.pin || ''}`) !== user.pin) {
          user.pin_failures = (user.pin_failures || 0) + 1
          save()
          const left = PIN_TRIES - user.pin_failures
          fail(403, left ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN. Your PIN is now locked: set a new one under Security.')
        }
        user.pin_failures = 0
      }
      Object.assign(c, { decision: body.action, decided_at: now(), decided_by: user.id })
      save()
      return checkOut(c)
    }
  }

  if (route === '/dashboard') {
    const start = monthStart()
    const mine = db.checks.filter(c => c.org_id === orgId)
    const month = mine.filter(c => c.created_at >= start)
    return {
      checks_this_month: month.length,
      high_risk_this_month: month.filter(c => c.level === 'high').length,
      awaiting_callback: mine.filter(c => c.callback_status === 'pending' && c.decision === 'none').length,
      released_this_month: month.filter(c => c.decision === 'released').length,
      blocked_this_month: month.filter(c => c.decision === 'blocked').length,
      recent: [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(summaryOut),
    }
  }

  fail(404, 'Not found.')
}

// Erases everything demo mode stored in this browser (the right to have personal information deleted, POPIA section 24).
export function resetDemo() {
  db = fresh()
  setTab(null)
  storage(s => s.removeItem(KEY))
}
