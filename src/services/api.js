// All backend calls live here. Pages never call fetch directly.
// The FastAPI backend (TriGuard-AI-Backend) returns a richer result; toCheckResult() maps it to the shape the
// pages use: { verdict, score, reasons, reportCount } plus extra fields (headline, summary, advice...) for later.
// API docs: http://localhost:8000/docs
import {
  mockNumberResult,
  mockMessageResult,
  mockVoiceResult,
  mockReportResponse,
  mockHistory,
  mockInsights,
} from '../mock/mockData.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const MOCK_DELAY_MS = 700

function mock(data) {
  // Return a copy so callers can't mutate the shared mock objects.
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_DELAY_MS))
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new Error('Can’t reach TriGuard right now. Check your connection and try again.')
  }
  if (!res.ok) {
    // FastAPI errors look like { detail: "message" } (or a list for invalid input).
    const body = await res.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : null
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json()
}

function postJson(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Backend risk levels: safe | low | medium | high | critical.
const VERDICTS = { safe: 'safe', low: 'safe', medium: 'suspicious', high: 'scam', critical: 'scam' }

function toCheckResult(r) {
  const reasons = [...new Set((r.indicators ?? []).map((i) => i.title))]
  return {
    verdict: VERDICTS[r.risk_level] ?? 'suspicious',
    score: r.risk_score,
    reasons: reasons.length ? reasons : [r.summary],
    reportCount: r.total_reports ?? 0,
    // Extra detail from the backend, ready for the full result screen.
    riskLevel: r.risk_level,
    headline: r.headline,
    summary: r.summary,
    advice: r.advice ?? [],
    disclaimer: r.disclaimer,
    language: r.language,
    raw: r,
  }
}

// language: en, af, zu, xh, nso, ts, st, tn, ss, ve, nr ('auto' = answer in the message's own language).
export async function checkNumber(number, language = 'en') {
  if (USE_MOCK) return mock(mockNumberResult(number))
  const params = new URLSearchParams({ number, language })
  return toCheckResult(await request(`/api/v1/numbers/lookup?${params}`))
}

export async function checkMessage(text, language = 'auto') {
  if (USE_MOCK) return mock(mockMessageResult(text))
  return toCheckResult(await postJson('/api/v1/messages/analyze', { text, language }))
}

// Voice checks take ~10 s (longer on the first request after the server starts).
export async function checkVoice(file, language = 'en') {
  if (USE_MOCK) return mock(mockVoiceResult(file))
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)
  // No Content-Type header: the browser sets the multipart boundary.
  return toCheckResult(await request('/api/v1/voice/analyze', { method: 'POST', body: form }))
}

const REPORT_CATEGORIES = {
  'Banking / OTP': 'impersonation_bank',
  'Fake delivery': 'delivery_scam',
  'Job offer': 'job_scam',
  'Prize / lottery': 'prize_lottery',
  'Family emergency': 'impersonation_family',
  'AI voice clone': 'ai_voice_clone',
}

// Anonymous random id per install, so one phone can't report the same number over and over.
function deviceId() {
  try {
    let id = localStorage.getItem('triguard.device')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('triguard.device', id)
    }
    return id
  } catch {
    return undefined
  }
}

export async function reportScam({ number, channel, scamType, message }) {
  if (USE_MOCK) return mock(mockReportResponse)
  const res = await postJson('/api/v1/numbers/report', {
    number,
    category: REPORT_CATEGORIES[scamType] ?? 'other',
    channel: channel.toLowerCase(),
    comment: message || null,
    reporter_id: deviceId(),
  })
  return { ok: res.accepted, message: res.message, number: res.number }
}

// History is kept on the phone only (see useHistory) - the backend never stores what people check.
export function getHistory() {
  if (USE_MOCK) return mock(mockHistory)
  try {
    return Promise.resolve(JSON.parse(localStorage.getItem('triguard.history')) ?? [])
  } catch {
    return Promise.resolve([])
  }
}

export async function getInsights() {
  if (USE_MOCK) return mock(mockInsights)
  const r = await request('/api/v1/insights')
  return {
    stats: {
      checksToday: r.checks_today,
      scamsDetected: r.scams_detected_today,
      reportsThisWeek: r.reports_this_week,
    },
    topScamTypes: r.top_scam_types.map((t) => ({ type: t.label, count: t.count })),
    mostReported: r.most_reported.map((n) => ({ number: n.number, reports: n.total_reports, type: n.top_category_label })),
  }
}

// Which features and languages the backend supports right now.
export function getCapabilities() {
  return request('/api/v1/capabilities')
}
