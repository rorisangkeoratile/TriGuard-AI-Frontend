import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../api/index.js'
import { DEMO_MODE } from '../api/client.js'
import { Alert, Field } from '../components/ui.jsx'
import { passwordProblem } from '../lib/format.js'
import AuthShell from './AuthShell.jsx'

// Store owners reset a forgotten password with a one-time link sent to their email.
// Staff don't get a link: their store owner gives them a new temporary password on the Team page.
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      setResult(await auth.forgot(email.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Store owners get a reset link by email." footer={<Link to="/login">Back to log in</Link>}>
      <Alert kind="info"><b>Staff:</b> ask your store owner. They can give you a new temporary password on the Team page.</Alert>
      <Alert>{error}</Alert>
      {result ? (
        <>
          <Alert kind="success">If a store owner account uses this email, we’ve sent a reset link to it. The link works once, for 30 minutes.</Alert>
          {DEMO_MODE && result.demo_reset_token && (
            <Alert kind="warn">Demo mode can’t send email. <Link to={`/reset-password?token=${result.demo_reset_token}`}>Open the reset link</Link></Alert>
          )}
        </>
      ) : (
        <form onSubmit={submit} noValidate className="form">
          <Field id="email" label="Work email">
            <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const token = params.get('token') || ''
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    const problem = passwordProblem(form.next)
    if (problem) errs.next = problem
    if (form.confirm !== form.next) errs.confirm = 'The passwords don’t match.'
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await auth.reset(token, form.next)
      navigate('/login', { replace: true, state: { message: 'Your password is reset. Log in with the new password.' } })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You’ll be signed out everywhere else." footer={<Link to="/login">Back to log in</Link>}>
      {!token && <Alert>This link is incomplete. Open the link from your email again, or <Link to="/forgot-password">ask for a new one</Link>.</Alert>}
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate className="form">
        <Field id="pw-new" label="New password" error={errors.next} hint="At least 10 characters, with numbers or symbols.">
          <input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} aria-invalid={!!errors.next} autoFocus />
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
          <input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy || !token}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthShell>
  )
}
