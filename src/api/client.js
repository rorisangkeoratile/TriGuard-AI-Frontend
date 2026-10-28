// Every backend request goes through here. The session lives in an httpOnly cookie set by the backend,
// so the app never sees or stores a token. The custom header lets the backend reject cross-site form posts.

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields // field name -> message, from validation errors
  }
}

const OFFLINE_MESSAGE = 'Can’t reach the TriGuard server. Check your connection, or ask your administrator to start the backend.'

// Status 0 means the server couldn't be reached at all.
export const isOffline = err => err instanceof ApiError && err.status === 0

// FastAPI errors are { detail: "text" } or { detail: [{ loc: [..., "field"], msg }] }.
function readError(status, body) {
  const detail = body && body.detail
  // 502–504: a proxy (Vite in development, or nginx) answered because the backend didn't.
  if (status === 502 || status === 504 || (status === 503 && (!detail || detail === 'backend_unreachable'))) {
    return new ApiError(OFFLINE_MESSAGE, 0)
  }
  if (Array.isArray(detail)) {
    const fields = {}
    for (const d of detail) {
      const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : ''
      if (field && !fields[field]) fields[field] = String(d.msg || '').replace(/^Value error, /, '')
    }
    return new ApiError('Please check the highlighted fields.', status, fields)
  }
  if (typeof detail === 'string') return new ApiError(detail, status)
  if (status === 401) return new ApiError('Please log in.', status)
  if (status >= 500) return new ApiError('Something went wrong on our side. Please try again.', status)
  return new ApiError(`Request failed (${status}).`, status)
}

// Demo mode (the default until VITE_USE_MOCK=false): the API is answered in the browser, see demo.js.
export const DEMO_MODE = import.meta.env.VITE_USE_MOCK !== 'false'

export async function request(path, { method = 'GET', json, form, signal } = {}) {
  if (DEMO_MODE) {
    const { demoRequest } = await import('./demo.js')
    return demoRequest(path, method, json, form)
  }
  const headers = { 'X-Requested-With': 'TriGuard', Accept: 'application/json' }
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form // the browser sets the multipart boundary
  }

  let res
  try {
    res = await fetch('/api' + path, { method, headers, body, credentials: 'same-origin', signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }

  if (res.status === 204) return null
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) throw readError(res.status, data)
  return data
}
