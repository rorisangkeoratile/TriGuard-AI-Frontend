const dateTime = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// The payment check: three yes/no questions answered by staff. Each "yes" raises the risk.
// No amounts, payee names or bank account numbers are collected (POPIA section 10, minimality).
export const PAYMENT_QUESTIONS = [
  ['new_payee_or_bank_change', 'Is this a new supplier, or have the bank details changed?'],
  ['larger_than_usual', 'Is it bigger than payments you normally make?'],
  ['skip_approval', 'Were you asked to skip the normal approval?'],
]

export const formatWhen = iso => (iso ? dateTime.format(new Date(iso)) : '—')

export const LEVEL_LABEL = { high: 'High risk', medium: 'Medium risk', low: 'Low risk' }

export const CALLBACK_LABEL = {
  pending: 'Call-back needed',
  confirmed: 'Confirmed by call-back',
  denied: 'Denied: not them',
  no_answer: 'No answer yet',
}

export const DECISION_LABEL = { none: 'Not decided', released: 'Payment released', blocked: 'Payment blocked' }

// South African numbers to +27 format: 082 555 0143 -> +27825550143
export function normalisePhone(value) {
  let d = String(value || '').replace(/[^\d+]/g, '')
  if (d.startsWith('00')) d = '+' + d.slice(2)
  if (/^0\d{9}$/.test(d)) d = '+27' + d.slice(1)
  if (/^27\d{9}$/.test(d)) d = '+' + d
  return d
}

export const isPhone = value => /^\+\d{9,15}$/.test(normalisePhone(value))

export function passwordProblem(pw) {
  if (pw.length < 10) return 'Use at least 10 characters.'
  if (/^[a-z]+$/i.test(pw) || /^\d+$/.test(pw)) return 'Mix letters with numbers or symbols.'
  return ''
}

export const isEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)

export const AUDIO_ACCEPT = 'audio/*,.opus,.ogg,.m4a,.mp3,.wav,.webm,.flac'
export const MAX_UPLOAD_MB = 15

// Payment PIN: 6 digits, and not one a thief would guess first.
export function pinProblem(pin) {
  const p = String(pin || '')
  if (!/^\d{6}$/.test(p)) return 'Use exactly 6 digits.'
  if (/^(\d)\1{5}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p)) return 'That PIN is too easy to guess.'
  return ''
}

export const DEVICE_STATUS_LABEL = { approved: 'Approved', pending: 'Waiting for approval', blocked: 'Blocked' }
