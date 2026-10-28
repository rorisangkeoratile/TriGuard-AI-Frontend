import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { DEMO_MODE } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { Alert, Field } from '../components/ui.jsx'
import { isEmail } from '../lib/format.js'
import AuthShell from './AuthShell.jsx'

export default function Login() {
  const { status, notice, login } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState('') // a device the store owner hasn't approved yet
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
    } catch (err) {
      setError(err.message)
      setErrors(err.fields || {})
    } finally {
      setBusy(false)
    }
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
