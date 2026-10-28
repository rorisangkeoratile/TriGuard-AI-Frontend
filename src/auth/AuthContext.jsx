import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../api/index.js'
import { isOffline } from '../api/client.js'
import { deviceKey, deviceLabel } from '../lib/device.js'

const AuthContext = createContext(null)

// How often a signed-in device asks the server whether it's still allowed in. A device reported
// lost or stolen is signed out within this time.
const RECHECK_MS = 5000

// Typing, clicking, scrolling or touching the page since the last re-check. Background re-checks alone don't keep
// a session alive, so an unattended computer is signed out after the idle time.
let usedSinceCheck = false
const markUsed = () => { usedSinceCheck = true }
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, markUsed, { passive: true })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | in | out | offline
  const [notice, setNotice] = useState('') // why the user was signed out, shown on the login page

  const refresh = useCallback(async () => {
    try {
      const active = usedSinceCheck
      usedSinceCheck = false
      const u = await auth.me(active)
      setUser(prev => (JSON.stringify(prev) === JSON.stringify(u) ? prev : u))
      setStatus('in')
    } catch (err) {
      if (isOffline(err)) { setStatus(s => (s === 'in' ? s : 'offline')); return }
      setStatus(s => {
        if (s === 'in') setNotice(err.message)
        return 'out'
      })
      setUser(null)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (status !== 'in') return
    const timer = setInterval(refresh, RECHECK_MS)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', refresh) // demo mode: another tab changed the data
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', refresh)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [status, refresh])

  // Login and register send this device's key. They return { step: 'done', user } on an approved device,
  // { step: 'pending', device } while the store owner hasn't approved it yet, or { step: 'otp', challenge } when
  // the account has sign-in codes on and the code from the authenticator app is needed next (loginOtp).
  const enter = useCallback(async (call, body) => {
    setNotice('')
    const result = await call({ ...body, device_key: deviceKey(), device_name: deviceLabel() })
    if (result.step === 'done') {
      setUser(result.user)
      setStatus('in')
    }
    return result
  }, [])
  const login = useCallback(body => enter(auth.login, body), [enter])
  const loginOtp = useCallback(body => enter(auth.loginOtp, body), [enter])
  const register = useCallback(body => enter(auth.register, body), [enter])

  const logout = useCallback(async () => {
    try { await auth.logout() } finally {
      setUser(null)
      setStatus('out')
    }
  }, [])

  const value = useMemo(
    () => ({ user, status, notice, login, loginOtp, register, logout, refresh }),
    [user, status, notice, login, loginOtp, register, logout, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="page-loading"><span className="spinner" aria-hidden="true" />Loading…</div>
  if (status !== 'in') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
