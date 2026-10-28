import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DEMO_MODE } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { Alert, Field } from '../components/ui.jsx'
import { isEmail, passwordProblem } from '../lib/format.js'
import AuthShell from './AuthShell.jsx'

const EMPTY = { full_name: '', company: '', email: '', password: '', confirm: '', accept_terms: false }

export function validateRegister(f) {
  const errs = {}
  if (f.full_name.trim().length < 2) errs.full_name = 'Enter your full name.'
  if (f.company.trim().length < 2) errs.company = 'Enter your store name.'
  if (!isEmail(f.email.trim())) errs.email = 'Enter a valid email address.'
  const pw = passwordProblem(f.password)
  if (pw) errs.password = pw
  if (f.confirm !== f.password) errs.confirm = 'The passwords don’t match.'
  if (!f.accept_terms) errs.accept_terms = 'Please accept to continue.'
  return errs
}

export default function Register() {
  const { status, register } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  // A new owner goes to Trusted contacts first; someone already logged in goes to the dashboard.
  if (status === 'in') return justRegistered
    ? <Navigate to="/app/contacts" replace state={{ welcome: true }} />
    : <Navigate to="/app" replace />

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    // Demo mode accepts any details; with the real backend the form rules apply.
    const errs = DEMO_MODE ? {} : validateRegister(form)
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return
    setBusy(true)
    setJustRegistered(true)
    try {
      const { confirm, ...body } = form
      const result = await register({ ...body, full_name: body.full_name.trim(), company: body.company.trim(), email: body.email.trim() })
      if (result.step === 'pending') setError('This device is waiting for the store owner’s approval. Ask them to approve it under Security, then log in.')
    } catch (err) {
      setJustRegistered(false)
      setError(err.message)
      setErrors(err.fields || {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Register your store"
      subtitle="You’ll be the store owner on TriGuard. You can add your managers and cashiers afterwards."
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      {status === 'offline' && !error && <Alert kind="warn">Can’t reach the TriGuard server right now. Registering will work once the backend is running.</Alert>}
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate className="form">
        <Field id="full_name" label="Your full name" error={errors.full_name}>
          <input id="full_name" autoComplete="name" value={form.full_name} onChange={set('full_name')} aria-invalid={!!errors.full_name} autoFocus />
        </Field>
        <Field id="company" label="Store name" error={errors.company}>
          <input id="company" autoComplete="organization" value={form.company} onChange={set('company')} aria-invalid={!!errors.company} />
        </Field>
        <Field id="email" label="Work email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
        </Field>
        <div className="form-row">
          <Field id="password" label="Password" error={errors.password} hint="At least 10 characters, with numbers or symbols.">
            <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
          </Field>
          <Field id="confirm" label="Confirm password" error={errors.confirm}>
            <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
          </Field>
        </div>
        <div className={`check-field${errors.accept_terms ? ' has-error' : ''}`}>
          <label>
            <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} />
            <span>I have read the <Link to="/privacy" target="_blank">privacy notice</Link>. TriGuard processes voice notes and contact details only to check for fraud.</span>
          </label>
          {errors.accept_terms && <p className="field-error">{errors.accept_terms}</p>}
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  )
}
