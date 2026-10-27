// All backend calls live here. Pages never call fetch directly.
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
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
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

export function checkNumber(number) {
  if (USE_MOCK) return mock(mockNumberResult(number))
  return postJson('/check/number', { number })
}

export function checkMessage(text) {
  if (USE_MOCK) return mock(mockMessageResult(text))
  return postJson('/check/message', { text })
}

export function checkVoice(file) {
  if (USE_MOCK) return mock(mockVoiceResult(file))
  const form = new FormData()
  form.append('file', file)
  // No Content-Type header: the browser sets the multipart boundary.
  return request('/check/voice', { method: 'POST', body: form })
}

export function reportScam(report) {
  if (USE_MOCK) return mock(mockReportResponse)
  return postJson('/report', report)
}

export function getHistory() {
  if (USE_MOCK) return mock(mockHistory)
  return request('/history')
}

export function getInsights() {
  if (USE_MOCK) return mock(mockInsights)
  return request('/insights')
}
