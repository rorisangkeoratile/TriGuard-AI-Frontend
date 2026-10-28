// "Put the payment on hold" in the Outlook add-in opens /app/check#from=outlook&text=<the email>. The part after #
// never reaches the web server. It's moved into this tab's session storage at start-up and removed from the address
// bar, so it survives a detour through the login page and doesn't linger in the browser history.
const KEY = 'triguard.outlook-email'
let pending = null // fallback when session storage is blocked

export function captureOutlookEmail() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (params.get('from') !== 'outlook' || !params.get('text')) return
  pending = params.get('text')
  try { sessionStorage.setItem(KEY, pending) } catch { /* keep it in memory */ }
  window.history.replaceState(null, '', window.location.pathname)
}

/** Returns the email once, then forgets it. */
export function takeOutlookEmail() {
  let text = pending
  try { text = sessionStorage.getItem(KEY) || text; sessionStorage.removeItem(KEY) } catch { /* use memory */ }
  pending = null
  return text
}
