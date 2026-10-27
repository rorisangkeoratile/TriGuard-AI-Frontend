// The individual warning signs. Each one adds points; analyze.js turns the total into a risk level.
// Rules read both the cleaned text and the "loose" copy from prepareText(), so disguised words ("0TP", "O T P") still match.
import { cap } from './normalize.js'
import { ML } from './language.js'

// Brands scammers copy, with their real domains. The first three are the demo's fictional brands.
// In production this list comes from the backend so it can grow without an app update.
export const BRANDS = [
  { name: 'ubuntu bank', key: 'ubuntubank', domain: 'ubuntubank.co.za' },
  { name: 'swiftparcel', key: 'swiftparcel', domain: 'swiftparcel.co.za' },
  { name: 'karoo supplies', key: 'karoo', domain: 'karoosupplies.co.za' },
  { name: 'sassa', label: 'SASSA', key: 'sassa', domain: 'sassa.gov.za' },
  { name: 'sars', label: 'SARS', key: 'sars', domain: 'sars.gov.za' },
  { name: 'capitec', key: 'capitec', domain: 'capitecbank.co.za' },
  { name: 'fnb', label: 'FNB', key: 'fnb', domain: 'fnb.co.za' },
  { name: 'absa', key: 'absa', domain: 'absa.co.za' },
  { name: 'standard bank', key: 'standardbank', domain: 'standardbank.co.za' },
  { name: 'nedbank', key: 'nedbank', domain: 'nedbank.co.za' },
  { name: 'takealot', key: 'takealot', domain: 'takealot.com' },
]

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
const brandLabel = b => b.label || cap(b.name)
const isBrandDomain = host => BRANDS.some(b => host === b.domain || host.endsWith('.' + b.domain))
/** A brand whose name is misspelled by one letter in the host ("capltec", "absaa"), if any. */
function misspelledBrand(host) {
  if (isBrandDomain(host)) return null
  const tokens = host.split('.')[0].split('-')
  return BRANDS.find(b => b.key.length >= 4 && tokens.some(tk => tk !== b.key && tk.length >= 4 && editDistance(tk, b.key) === 1)) || null
}

// Banks scammers commonly pretend to be. A saved contact marked org:'bank' is the user's real bank line.
const BANK_WORDS = /\b(?:bank|absa|capitec|fnb|nedbank|investec|tymebank)\b|fraud (?:department|dept|team)/i
// Scam SMSes often leave out "https://", so bare domains like bit.ly/abc or sars-refund.co.za count as links too.
const LINK = /(?:https?:\/\/|www\.)[^\s]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|info|xyz|top|ly|co|io|me|link|online|site|click|za)(?:\/[^\s]*)?(?![\w.])/gi
const OTP_TERM = /\b(?:otp|one[- ]?time[- ]?p[i1l]n|p[i1l|!]n(?: ?(?:code|number))?|password|passcode|verification code|security code|cvv)\b/i
const OTP_ASK = /\b(?:send|share|give|read|tell|reply|forward|provide|confirm|repeat|whatsapp)\b|\bwhat(?:'s| is) the\b/i
// "We will never ask for your PIN." and "Do not share it with anyone." are warnings, not requests.
const SAFETY_LINE = /(?:never|won'?t|will not|don'?t|do not) (?:ask|share|need)[^.\n]*[.\n]?/gi

/** Collects warning signs from the event. `ctx.trusted` is the sender's saved-contact entry, if any. */
export function contentSignals(ev, prepared, ctx, add) {
  const { text, loose } = prepared
  const hay = text + '\n' + loose
  const who = (ev.fromName || '') + ' ' + (ev.callerName || '')
  const isEmail = ev.channel === 'email' || ev.msgType === 'email'
  const trusted = ctx.trusted

  // impersonation
  if (!isEmail && (BANK_WORDS.test(hay + ' ' + who) || ML.bank.test(hay)) && !(trusted && trusted.org === 'bank'))
    add(25, 'Says it is from a bank, but this is not your bank’s official number.', 'impersonation', 'bankImp')
  if ((/new number|lost my phone|changed my number|\bit'?s me\b/i.test(hay) || ML.known.test(hay)) && !trusted)
    add(25, 'Claims to be someone you know, from a number not in your contacts.', 'impersonation', 'knownImp')

  // wording
  if (/urgent|immediately|right now|\basap\b|within 24 hours|before \d|\btoday\b|\bnow\b/i.test(hay) || ML.urgent.test(hay)) add(10, 'Pushes you to act fast.', 'content', 'urgency')
  if (/\bR\s?\d|send (me )?money|transfer|\bpay\b|payment|\beft\b|deposit|\bfee\b/i.test(hay) || ML.money.test(hay)) add(15, 'Asks for money or a payment.', 'content', 'money')
  if (/don'?t tell|tell anyone|keep (this|it) (between|quiet|secret)|confidential/i.test(hay) || ML.secret.test(hay)) add(15, 'Asks you to keep it secret.', 'content', 'secret')
  // An OTP only counts as asked for when a code word and a request verb are in the same sentence,
  // so a genuine "Your OTP is 123456. Do not share it." from a bank is not flagged.
  const sentences = hay.replace(SAFETY_LINE, '\n').split(/[.?!\n]+/)
  if (sentences.some(s => (OTP_TERM.test(s) || ML.otp.test(s)) && (OTP_ASK.test(s) || ML.request.test(s))))
    add(30, 'Asks for an OTP, PIN or password. No real bank or company asks for these.', 'content', 'otp')
  if (/blocked|suspended|locked|arrest|legal action|final notice/i.test(hay) || ML.threat.test(hay)) add(10, 'Uses a threat to scare you.', 'content', 'threat')
  if (/police|\bsaps\b|sergeant|constable|warrant/i.test(hay + ' ' + who) || ML.police.test(hay)) add(25, 'Says it is the police. Police don’t ask for fines or payments over the phone.', 'impersonation', 'policeImp')
  if (/earn R?\s?\d[\d,]*\s?(a|per) (day|week)|from home|liking videos|easy money/i.test(hay)) add(20, 'Promises easy money for little work.', 'content', 'easymoney')
  if (/\byou(?:'ve| have)? won\b|winner|prize|congratulations/i.test(hay) || ML.prize.test(hay)) add(15, 'Promises a prize you did not enter for.', 'content', 'prize')
  if (/(confirm|verify|update)\s+(your\s+)?(\w+\s+)?(details|information|identity|account)/i.test(hay) || ML.verify.test(hay)) add(20, 'Asks you to confirm personal details.', 'content', 'detailsReq')
  if (/(new|updated|changed?) (bank(ing)?|account) details/i.test(hay)) add(30, 'Asks you to pay into new bank details.', 'content', 'bankchange')
  if (/\bproof of payment\b|\bpop\b|payment (?:confirmation|notification|slip)|\bi(?:'ve| have)? (?:paid|transferred|made the payment|sent the money)\b/i.test(hay))
    add(25, 'Says they have paid and points to a slip or screenshot. A slip is not money until it shows in your banking app.', 'content', 'pop')
  ;(ctx.waves || []).forEach(w => {
    if (new RegExp(w.pattern, 'i').test(hay)) add(20, `Matches a scam going around this week: ${w.name} (${w.reports} reports).`, 'community', 'wave')
  })

  // links
  linkUrls(text).forEach(u => {
    const host = hostOf(u)
    const b = !isBrandDomain(host) && BRANDS.find(b => host.includes(b.key))
    const typo = misspelledBrand(host)
    if (/(^|\.)(bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)$/.test(host)) add(15, `Shortened link hides where it really goes (${host}).`, 'link', 'shortlink')
    else if (/(^|\.)xn--/.test(host)) add(25, `The web address ${host} uses look-alike letters from another alphabet.`, 'link', 'punycode')
    else if (b) add(25, `Link looks like ${brandLabel(b)} but goes to ${host}.`, 'link', 'lookalike')
    else if (typo) add(25, `${host} is spelled one letter away from ${brandLabel(typo)}.`, 'link', 'typosquat')
    else if (/^http:\/\//i.test(u)) add(8, 'Link is not secure (http).', 'link', 'http')
  })

  // email sender checks
  if (isEmail) {
    const addr = (ev.fromAddr || '').toLowerCase()
    const dom = addr.split('@')[1] || ''
    const name = (ev.fromName || '').toLowerCase()
    const nb = BRANDS.find(b => name.includes(b.name) || name.includes(b.key))
    if (nb && dom !== nb.domain) add(25, `Sender name says ${brandLabel(nb)}, but the address is @${dom}.`, 'sender', 'senderName')
    if (ev.replyTo && (ev.replyTo.split('@')[1] || '').toLowerCase() !== dom) add(15, `Replies would go to a different address (${ev.replyTo}).`, 'sender', 'replyTo')
    const a = ev.auth || {}
    const fails = ['spf', 'dkim', 'dmarc'].filter(k => a[k] === 'fail')
    if (fails.length) add(10 + fails.length * 5, `Sender checks failed (${fails.map(x => x.toUpperCase()).join(', ')}), so it may not come from who it says.`, 'sender', 'auth')
    ;(ev.attachments || []).forEach(f => { if (/\.(html?|exe|scr|js|zip|iso|docm|xlsm)$/i.test(f)) add(20, `Risky attachment: ${f}.`, 'attachment', 'attach') })
  }
}

/** Every link in a text, without email addresses. */
export function linkUrls(text) { return [...new Set(String(text || '').replace(/\S+@\S+/g, ' ').match(LINK) || [])] }
export const hostOf = u => u.replace(/^https?:\/\//i, '').split('/')[0].replace(/[.,;:!?)]+$/, '').toLowerCase()

/**
 * Evidence from other services, attached to the event before scoring:
 * linkIntel (link reputation), simSwap (mobile network), verification (the contact's own app), safeWord,
 * liveness (video challenge), accountCheck (bank account verification), editScore (image forensics).
 */
export function serviceSignals(ev, add) {
  ;(ev.linkIntel || []).forEach(l => {
    if (l.listed) add(40, `${l.host} is on a list of known scam websites.`, 'link', 'blocklisted')
    else if (l.ageDays != null && l.ageDays < 30) add(20, `${l.host} was registered ${l.ageDays} day${l.ageDays === 1 ? '' : 's'} ago. Scam sites are usually brand new.`, 'link', 'newDomain')
  })
  if (ev.simSwap && ev.simSwap.hoursAgo != null && ev.simSwap.hoursAgo <= 72)
    add(30, `The mobile network says this number’s SIM was changed ${ev.simSwap.hoursAgo} hour${ev.simSwap.hoursAgo === 1 ? '' : 's'} ago. Whoever has it now may not be the owner.`, 'number', 'simSwap')
  if (ev.verification && ev.verification.answer === 'no')
    add(60, `${ev.verification.contact} answered in their own TriGuard app: “It’s not me.”`, 'verify', 'verifyNo')
  if (ev.safeWord === 'fail') add(40, 'The caller didn’t know your family safe word.', 'verify', 'safeWordFail')
  if (ev.liveness === 'fail') add(40, 'The face broke up during the liveness check (head turn and hand in front of the face).', 'deepfake', 'livenessFail')
  if (ev.accountCheck && ev.accountCheck.nameMatch === false)
    add(40, `The bank says this account is not in the name of ${ev.accountCheck.holder}.`, 'payment', 'accountMismatch')
  if (typeof ev.editScore === 'number' && ev.editScore >= 0.6)
    add(25, 'The image shows signs of editing: some numbers or letters don’t match the rest of it.', 'image', 'imageEdited')
}

/** Voice and face scores come from the AI models (simulated in the demo, from the backend in production). */
export function mediaSignals(ev, ctx, add, sig) {
  if (typeof ev.voiceScore === 'number') {
    if (ev.voiceScore >= 0.7) add(45, `Voice shows strong signs of AI cloning (${Math.round(ev.voiceScore * 100)}%).`, 'deepfake', 'voiceHi')
    else if (ev.voiceScore >= 0.4) add(20, `Voice shows some signs of AI manipulation (${Math.round(ev.voiceScore * 100)}%).`, 'deepfake', 'voiceMid')
  }
  if (typeof ev.faceScore === 'number') {
    if (ev.faceScore >= 0.7) add(45, `Face shows strong signs of deepfake manipulation (${Math.round(ev.faceScore * 100)}%).`, 'deepfake', 'faceHi')
    else if (ev.faceScore >= 0.4) add(20, `Face shows some signs of manipulation (${Math.round(ev.faceScore * 100)}%).`, 'deepfake', 'faceMid')
  }
  if (ev.lipsync) add(15, 'Mouth movement does not match the words.', 'deepfake', 'lipsync')
  if (ctx.trusted && sig.some(s => s.kind === 'deepfake'))
    add(10, `Comes from ${ctx.trusted.name}’s saved number, but the voice doesn’t match. The phone may be stolen or the number spoofed.`, 'number', 'trustedSpoof')
}
