// Realistic fake responses so the UI works before the FastAPI backend is ready.
// Every check result uses the same shape: { verdict, score, reasons, reportCount }.

export const mockResults = {
  scam: {
    verdict: 'scam',
    score: 91,
    reasons: [
      'Reported 14 times this week',
      'Linked to banking scam reports',
      'Caller pretends to be from a bank fraud department',
    ],
    reportCount: 14,
  },
  suspicious: {
    verdict: 'suspicious',
    score: 58,
    reasons: [
      'Number was first reported 3 days ago',
      'Similar numbers are linked to delivery scams',
    ],
    reportCount: 2,
  },
  safe: {
    verdict: 'safe',
    score: 8,
    reasons: ['No scam reports found', 'No known scam patterns detected'],
    reportCount: 0,
  },
  messageScam: {
    verdict: 'scam',
    score: 94,
    reasons: [
      'Asks you to click a link to "verify" your account',
      'Creates urgency: "your account will be blocked today"',
      'Link domain does not belong to the bank it mentions',
    ],
    reportCount: 37,
  },
  messageSuspicious: {
    verdict: 'suspicious',
    score: 62,
    reasons: [
      'Mentions a prize or refund you did not ask for',
      'Contains a shortened link',
    ],
    reportCount: 5,
  },
  voiceScam: {
    verdict: 'scam',
    score: 87,
    reasons: [
      'Voice shows signs of being AI-generated',
      'Speaker asks for an OTP / one-time PIN',
      'Script matches known "family emergency" scams',
    ],
    reportCount: 9,
  },
}

// Simple keyword rules so different demo inputs give different verdicts.
const SCAM_WORDS = ['otp', 'pin', 'verify', 'blocked', 'suspended', 'click', 'urgent']
const SUSPICIOUS_WORDS = ['prize', 'won', 'refund', 'bit.ly', 'tinyurl', 'parcel', 'delivery']

export function mockNumberResult(number = '') {
  const digits = number.replace(/\D/g, '')
  if (digits.endsWith('4567') || digits.startsWith('087')) return mockResults.scam
  if (digits.startsWith('086') || digits.endsWith('0000')) return mockResults.suspicious
  return mockResults.safe
}

export function mockMessageResult(text = '') {
  const lower = text.toLowerCase()
  if (SCAM_WORDS.some((w) => lower.includes(w))) return mockResults.messageScam
  if (SUSPICIOUS_WORDS.some((w) => lower.includes(w))) return mockResults.messageSuspicious
  return { ...mockResults.safe, reasons: ['No known scam phrases found', 'No suspicious links detected'] }
}

export function mockVoiceResult() {
  return mockResults.voiceScam
}

export const mockReportResponse = {
  ok: true,
  id: 'rep_10293',
  message: 'Thanks. Your report helps protect others.',
}

export const mockHistory = [
  {
    id: 'h1',
    type: 'number',
    input: '+27 82 123 4567',
    verdict: 'scam',
    score: 91,
    checkedAt: '2026-10-27T08:14:00Z',
  },
  {
    id: 'h2',
    type: 'message',
    input: 'FNB: Your account has been suspended. Verify now at fnb-secure-login.co',
    verdict: 'scam',
    score: 94,
    checkedAt: '2026-10-26T17:42:00Z',
  },
  {
    id: 'h3',
    type: 'message',
    input: 'Your parcel is waiting. Pay R25 customs fee: bit.ly/sa-post',
    verdict: 'suspicious',
    score: 62,
    checkedAt: '2026-10-26T11:05:00Z',
  },
  {
    id: 'h4',
    type: 'number',
    input: '+27 11 555 0198',
    verdict: 'safe',
    score: 8,
    checkedAt: '2026-10-25T14:30:00Z',
  },
  {
    id: 'h5',
    type: 'voice',
    input: 'voice-note-2026-10-24.ogg',
    verdict: 'scam',
    score: 87,
    checkedAt: '2026-10-24T19:12:00Z',
  },
]

export const mockInsights = {
  stats: {
    checksToday: 1284,
    scamsDetected: 312,
    reportsThisWeek: 947,
  },
  topScamTypes: [
    { type: 'Banking / OTP', count: 412 },
    { type: 'Fake delivery', count: 268 },
    { type: 'Job offer', count: 151 },
    { type: 'Prize / lottery', count: 97 },
    { type: 'Family emergency', count: 64 },
  ],
  mostReported: [
    { number: '+27 87 550 1123', reports: 58, type: 'Banking / OTP' },
    { number: '+27 82 123 4567', reports: 41, type: 'Banking / OTP' },
    { number: '+27 61 900 4432', reports: 29, type: 'Fake delivery' },
    { number: '+27 73 210 8890', reports: 17, type: 'Job offer' },
  ],
}
