import { useState } from 'react'
import { auth } from '../../api/index.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, Field } from '../../components/ui.jsx'
import { passwordProblem } from '../../lib/format.js'

// Used on the Security page, and as the only screen a staff member sees until they replace their temporary password.
export default function ChangePassword({ forced = false }) {
  const { refresh } = useAuth()
  const empty = { current: '', next: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    const problem = passwordProblem(form.next)
    if (problem) errs.next = problem
    if (form.confirm !== form.next) errs.confirm = 'The passwords don’t match.'
    setErrors(errs)
    setError('')
    setDone('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await auth.changePassword(form.current, form.next)
      setForm(empty)
      setDone('Your password is changed. You’ve been signed out on your other devices.')
      refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>{forced ? 'Choose your own password' : 'Change password'}</h2>
      <p className="small muted">
        {forced
          ? 'Your store owner gave you a temporary password. Replace it with one only you know before you use TriGuard.'
          : 'If you think someone else knows your password, change it here. You’ll be signed out on your other devices.'}
      </p>
      <Alert>{error}</Alert>
      <Alert kind="success">{done}</Alert>
      <Field id="pw-current" label={forced ? 'Temporary password' : 'Current password'}>
        <input id="pw-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
      </Field>
      <Field id="pw-new" label="New password" error={errors.next} hint="At least 10 characters, with numbers or symbols.">
        <input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} aria-invalid={!!errors.next} />
      </Field>
      <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : forced ? 'Save and continue' : 'Change password'}</button>
    </form>
  )
}
