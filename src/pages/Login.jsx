import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { DEMO_MODE } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { Alert, Field } from '../components/ui.jsx'
import { isEmail } from '../lib/format.js'
import AuthShell from './AuthShell.jsx'

export default function Login() {
  const { status, notice, login, loginOtp } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState('') // a device the store owner hasn't approved yet
  const [challenge, setChallenge] = useState('') // password accepted; the sign-in code comes next
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'in') return <Navigate to={location.state?.from || '/app'} replace />

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    // Demo mode accepts any details; with the real backend the email and password are required.
    const errs = {}
    if (!DEMO_MODE && !isEmail(form.email.trim())) errs.email = 'Enter your email address.'
    if (!DEMO_MODE && !form.password) errs.password = 'Enter your password.'
    setErrors(errs)
    setError('')
    setPending('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const result = await login({ email: form.email.trim(), password: form.password })
      if (result.step === 'pending') setPending(result.device.name)
      if (result.step === 'otp') { setChallenge(result.challenge); setForm(f => ({ ...f, password: '' })) }
    } catch (err) {
      setError(err.message)
      setErrors(err.fields || {})
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true)
    try {
      const result = await loginOtp({ challenge, code: code.trim() })
      if (result.step === 'pending') { setChallenge(''); setPending(result.device.name) }
    } catch (err) {
      setError(err.message)
      setCode('')
      if (err.status === 429 || err.status === 401 && /expired/.test(err.message)) setChallenge('') // start again
    } finally {
      setBusy(false)
    }
  }

  if (challenge) {
    return (
      <AuthShell title="Enter your sign-in code" subtitle="Open your authenticator app and type the 6-digit code shown for TriGuard AI.">
        <Alert>{error}</Alert>
        <form onSubmit={submitCode} noValidate className="form">
          <Field id="code" label="Sign-in code" hint="The code changes every 30 seconds. Each code works once.">
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
          <button type="button" className="btn btn-outline btn-block" onClick={() => { setChallenge(''); setCode(''); setError('') }}>Back</button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Check before you pay."
      footer={<>New to TriGuard? <Link to="/register">Register your store</Link></>}
    >
      {status === 'offline' && !error && <Alert kind="warn">Can’t reach the TriGuard server right now. Logging in will work once the backend is running.</Alert>}
      {notice && !error && !pending && <Alert kind="warn">{notice}</Alert>}
      {pending && (
        <Alert kind="info">
          <b>This device is waiting for approval.</b> Only approved devices can open TriGuard. Ask your store owner to approve “{pending}” under Security, then log in again.
        </Alert>
      )}
      {location.state?.message && !error && <Alert kind="success">{location.state.message}</Alert>}
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate className="form">
        <Field id="email" label="Work email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} autoFocus />
        </Field>
        <Field id="password" label={<>Password <Link className="field-link" to="/forgot-password">Forgot password?</Link></>} error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthShell>
  )
}
