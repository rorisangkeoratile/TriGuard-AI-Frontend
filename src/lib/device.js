// Identifies this browser as a device, so the store owner can approve it and block it if it's lost or stolen.
// The key is random and says nothing about the person; the server stores only its hash.

export const toB64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const KEY = 'triguard-device-key'
let memoryKey = null

export function deviceKey() {
  try {
    let key = localStorage.getItem(KEY)
    if (!key) {
      key = toB64url(crypto.getRandomValues(new Uint8Array(32)))
      localStorage.setItem(KEY, key)
    }
    return key
  } catch {
    memoryKey ||= toB64url(crypto.getRandomValues(new Uint8Array(32))) // storage blocked: this visit only
    return memoryKey
  }
}

export function deviceLabel() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Android/.test(ua) ? 'Android phone' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'device'
  return `${browser} on ${os}`
}
