// The backend endpoints the app uses. docs/API.md describes each one for the backend developer.
import { request } from './client.js'

const toForm = fields => {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') form.append(key, value)
  }
  return form
}

export const auth = {
  // active: the person used the page since the last check, which keeps the session from timing out.
  me: active => request(active ? '/auth/me?active=1' : '/auth/me'),
  login: body => request('/auth/login', { method: 'POST', json: body }),
  register: body => request('/auth/register', { method: 'POST', json: body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  setPin: (pin, password) => request('/auth/pin', { method: 'PUT', json: { pin, password } }),
  changePassword: (current_password, new_password) => request('/auth/password', { method: 'PUT', json: { current_password, new_password } }),
  forgot: email => request('/auth/forgot', { method: 'POST', json: { email } }),
  reset: (token, new_password) => request('/auth/reset', { method: 'POST', json: { token, new_password } }),
  loginOtp: body => request('/auth/login/otp', { method: 'POST', json: body }),
  totpSetup: password => request('/auth/totp/setup', { method: 'POST', json: { password } }),
  totpEnable: code => request('/auth/totp/enable', { method: 'POST', json: { code } }),
  totpDisable: password => request('/auth/totp/disable', { method: 'POST', json: { password } }),
}

export const devices = {
  list: () => request('/devices'),
  approve: id => request(`/devices/${id}/approve`, { method: 'POST' }),
  block: id => request(`/devices/${id}/block`, { method: 'POST' }),
}

export const team = {
  list: () => request('/team'),
  add: body => request('/team', { method: 'POST', json: body }),
  remove: id => request(`/team/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) => request(`/team/${id}/password`, { method: 'PUT', json: { password } }),
}

export const contacts = {
  list: () => request('/contacts'),
  add: body => request('/contacts', { method: 'POST', json: body }),
  remove: id => request(`/contacts/${id}`, { method: 'DELETE' }),
  enrolVoice: (id, file) => request(`/contacts/${id}/voiceprint`, { method: 'POST', form: toForm({ file, consent: 'true' }) }),
  removeVoice: id => request(`/contacts/${id}/voiceprint`, { method: 'DELETE' }),
}

export const checks = {
  voice: (file, details, signal) => request('/checks/voice', { method: 'POST', form: toForm({ file, ...details }), signal }),
  text: body => request('/checks/text', { method: 'POST', json: body }),
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    return request('/checks' + (q.toString() ? `?${q}` : ''))
  },
  get: id => request(`/checks/${id}`),
  callback: (id, outcome, note) => request(`/checks/${id}/callback`, { method: 'POST', json: { outcome, note } }),
  decide: (id, action, pin) => request(`/checks/${id}/decision`, { method: 'POST', json: { action, pin } }),
}

export const dashboard = {
  summary: () => request('/dashboard'),
}
