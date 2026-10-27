import { normalizeNumber, prepareText } from './normalize.js'
import { origin } from './origin.js'
import { detectLang } from './language.js'
import { contentSignals, mediaSignals, serviceSignals } from './rules.js'
import { TIPS } from './tips.js'

/**
 * @typedef {Object} EngineContext  Lookups the engine needs about the user's own data. All optional.
 * @property {(num:string)=>({name:string,num:string,org?:string}|undefined)} [findTrusted]   saved contacts
 * @property {(num:string)=>({num:string,label:'scam'|'spam',note?:string}|undefined)} [findListed]  the user's scam/spam list
 * @property {(num:string)=>({reports:number,weighted?:number,type:string,from?:string}|undefined)} [findCommunity]  reports by other users
 * @property {{id:string,name:string,reports:number,pattern:string}[]} [waves]  scams going around this week
 *
 * @typedef {Object} DetectionEvent
 * @property {'call'|'video'|'sms'|'email'|'audio'|'videoFile'|'message'} channel
 * @property {string} [from]  phone number (any format)
 * @property {string} [text]  message text or call transcript so far
 * @property {string[]} [history]  earlier messages from the same sender, oldest first
 * @property {string} [subject] [fromName] [fromAddr] [replyTo] [callerName] [msgType]
 * @property {{spf?:string,dkim?:string,dmarc?:string}} [auth]
 * @property {string[]} [attachments]
 * @property {number} [voiceScore] [faceScore]  0..1 from the AI models
 * @property {boolean} [lipsync] [missed]
 * @property {string} [qrUrl]  link decoded from a QR code in an image
 * @property {number} [editScore]  0..1 image-editing score (proof-of-payment slips, screenshots)
 * @property {{host:string,ageDays?:number,listed?:boolean}[]} [linkIntel]  link reputation from the backend
 * @property {{hoursAgo:number}} [simSwap]  from the mobile network's SIM-swap check
 * @property {{contact:string,answer:'yes'|'no'}} [verification]  the contact's answer in their own TriGuard app
 * @property {'pass'|'fail'} [safeWord] [liveness]
 * @property {{holder:string,nameMatch:boolean,exists?:boolean}} [accountCheck]  bank account verification
 */

const HARD_RULES = [
  ['voiceHi', 'A cloned voice is High risk on its own. A real person never needs an AI copy of their voice.'],
  ['faceHi', 'A deepfake face is High risk on its own. A real person never needs an AI copy of their face.'],
  ['otp', 'Any request for an OTP, PIN or password is High risk on its own.'],
  ['bankchange', 'A request to pay into new bank details is High risk on its own.'],
  ['scamlist', 'Numbers on your own scam list are always High risk.'],
  ['verifyNo', 'The real person says it isn’t them. That is High risk on its own.'],
  ['safeWordFail', 'A caller who doesn’t know your family safe word is High risk on its own.'],
  ['livenessFail', 'A face that breaks up in a liveness check is High risk on its own.'],
  ['accountMismatch', 'Paying into an account that isn’t in the supplier’s name is High risk on its own.'],
  ['blocklisted', 'A link to a known scam website is High risk on its own.'],
]

/** Scores one event. Pure: the same event and context always give the same result. */
export function analyze(ev, ctx = {}) {
  const sig = []
  const add = (pts, text, kind, id) => sig.push({ pts, text, kind, id })
  const isEmail = ev.channel === 'email' || ev.msgType === 'email'
  const num = !isEmail ? normalizeNumber(ev.from) : null
  const trusted = num && ctx.findTrusted ? ctx.findTrusted(num) || null : null
  const mine = num && ctx.findListed ? ctx.findListed(num) || null : null
  const comm = num && ctx.findCommunity ? ctx.findCommunity(num) || null : null
  const history = (ev.history || []).filter(Boolean)
  const prepared = prepareText([...history, ev.subject, ev.text, ev.qrUrl].filter(Boolean).join('\n'))

  // number reputation
  if (mine && mine.label === 'scam') add(50, `On your own scam list${mine.note ? ` (“${mine.note}”)` : ''}.`, 'number', 'scamlist')
  if (mine && mine.label === 'spam') add(25, 'On your own spam list.', 'number', 'spamlist')
  const cw = comm ? (comm.weighted != null ? comm.weighted : comm.reports) : 0
  if (comm) {
    if (cw >= 3) add(Math.min(45, 20 + comm.reports), `Reported by ${comm.reports} TriGuard users as “${comm.type}”.`, 'number', 'community')
    else add(8, comm.reports >= 3 ? `${comm.reports} reports, but most come from new or linked accounts, so they count for little.` : `${comm.reports} unconfirmed report${comm.reports > 1 ? 's' : ''} from other users.`, 'number', 'communityLow')
  }
  const org = origin(num)
  if (num && !num.startsWith('+27')) add(12, `Unexpected international number (${org.place}).`, 'number', 'intl')
  if (org && org.kind === 'Internet (VoIP) number') add(10, 'Internet (VoIP) number. These are easy to get and hard to trace.', 'number', 'voip')
  if (ev.missed) add(25, 'Rang once and hung up, so you call back at a premium rate.', 'number', 'wangiri')

  contentSignals(ev, prepared, { trusted, waves: ctx.waves }, add)
  mediaSignals(ev, { trusted }, add, sig)
  serviceSignals(ev, add)

  sig.sort((a, b) => b.pts - a.pts)
  let score = Math.min(100, sig.reduce((a, s) => a + s.pts, 0))
  let level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  // hard rules: some signs are serious enough on their own
  const has = id => sig.some(s => s.id === id)
  let rule = null
  for (const [id, txt] of HARD_RULES) { if (has(id)) { rule = txt; break } }
  if (!rule && has('detailsReq') && sig.some(x => x.kind === 'link')) rule = 'A link that asks you to confirm personal details is High risk on its own.'
  if (!rule && comm && cw >= 10) rule = `A number reported by ${comm.reports} people is High risk on its own.`
  if (!rule && has('simSwap') && (has('money') || has('otp'))) rule = 'A recently swapped SIM asking for money or codes is High risk on its own.'
  if (rule) { level = 'high'; score = Math.max(score, 80) }
  else if ((has('voiceMid') || has('faceMid')) && level === 'low') { level = 'medium'; score = Math.max(score, 35); rule = 'Possible AI manipulation always raises the risk to at least Medium.' }

  const type = scamType(sig, ev, level)
  const notes = []
  if (trusted) notes.push(`Saved contact: ${trusted.name}.`)
  if (history.length) notes.push(`Read together with ${history.length} earlier message${history.length > 1 ? 's' : ''} from this sender.`)
  if (ev.qrUrl) notes.push(`The link came from a QR code: ${ev.qrUrl}`)
  if (ev.verification && ev.verification.answer === 'yes') notes.push(`${ev.verification.contact} confirmed in their own TriGuard app that it’s them.`)
  if (ev.safeWord === 'pass') notes.push('The caller knew your family safe word.')
  if (ev.liveness === 'pass') notes.push('The face stayed consistent in the liveness check. Still verify any payment request.')
  if (ev.accountCheck && ev.accountCheck.nameMatch) notes.push(`The bank confirmed the account is in the name of ${ev.accountCheck.holder}.`)
  if (!sig.length) notes.push('No warning signs found. That does not make it safe.')
  return {
    lang: detectLang(prepared.text), score, level, rule, signals: sig, notes, type,
    label: type === 'deepfakeVideo' && ev.channel === 'videoFile' ? 'Deepfake video' : TIPS[type].label,
    tips: TIPS[type].tips, num, trusted: trusted ? trusted.name : null, origin: org,
    reportsFrom: comm && comm.from ? comm.from : null, comm,
  }
}

export function scamType(sig, ev, level) {
  const has = id => sig.some(s => s.id === id)
  if (level === 'low') return has('knownImp') ? 'newNumber' : 'general'
  if (ev.channel !== 'video' && (has('voiceHi') || has('voiceMid'))) return 'voiceClone'
  if (has('faceHi') || has('faceMid') || has('livenessFail')) return 'deepfakeVideo'
  if (has('verifyNo') || has('safeWordFail')) return 'impostor'
  if (has('otp')) return 'otp'
  if (has('bankchange') || has('accountMismatch')) return 'invoice'
  if (has('simSwap')) return 'simSwap'
  if (has('pop')) return 'pop'
  if (has('knownImp')) return 'family'
  if (has('bankImp')) return 'bank'
  if (has('policeImp')) return 'police'
  if (has('easymoney')) return 'job'
  if (has('wangiri')) return 'wangiri'
  if (sig.some(x => x.kind === 'link' || x.kind === 'sender')) return 'phishing'
  if (has('prize')) return 'prize'
  if (sig.some(x => x.kind === 'number')) return 'reported'
  return 'general'
}
