import { useState } from 'react'
import { team } from '../../api/index.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, Field, Spinner } from '../../components/ui.jsx'
import { formatWhen, isEmail, passwordProblem } from '../../lib/format.js'
import { useLoad } from '../../lib/useLoad.js'

export default function Team() {
  const { user } = useAuth()
  const isOwner = user.role === 'owner'
  const { data, error, loading, setData } = useLoad(() => team.list())
  const [removeError, setRemoveError] = useState('')
  const list = data || []

  async function remove(member) {
    if (!window.confirm(`Remove ${member.full_name}? They won’t be able to log in any more. Their past checks stay in the history.`)) return
    setRemoveError('')
    try {
      await team.remove(member.id)
      setData(list.filter(m => m.id !== member.id))
    } catch (err) {
      setRemoveError(err.message)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p className="page-sub">Everyone who can run checks and record call-backs for {user.company}.</p>
        </div>
      </div>

      <div className="contacts-grid">
        {isOwner ? <AddStaff onAdded={m => setData([...list, m])} /> : (
          <section className="card"><h2>Add staff</h2><p className="muted">Only the account owner can add or remove staff.</p></section>
        )}
        <section className="card">
          <h2>People</h2>
          {loading && <Spinner />}
          {error && <Alert>{error.message}</Alert>}
          <Alert>{removeError}</Alert>
          <ul className="contact-list">
            {list.map(m => (
              <li key={m.id} className="contact">
                <div className="contact-main">
                  <div>
                    <b>{m.full_name}</b>{m.id === user.id && <span className="muted"> (you)</span>}
                    <div className="small muted">{m.email} · since {formatWhen(m.created_at)}</div>
                  </div>
                  <span className={`badge ${m.role === 'owner' ? 'cb-confirmed' : 'cb-none'}`}>{m.role === 'owner' ? 'Owner' : 'Staff'}</span>
                </div>
                {isOwner && m.role !== 'owner' && <StaffActions member={m} onRemove={() => remove(m)} />}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

// For a staff member who forgot their password: the owner sets a new temporary one,
// which signs them out everywhere and makes them choose their own at the next login.
function StaffActions({ member, onRemove }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const problem = passwordProblem(password)
    setError(problem)
    setDone('')
    if (problem) return
    setBusy(true)
    try {
      await team.resetPassword(member.id, password)
      setDone(`${member.full_name} has been signed out. Give them the temporary password in person; they’ll choose their own when they log in.`)
      setPassword('')
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="btn-row">
        <button className="btn btn-outline btn-sm" onClick={() => { setOpen(o => !o); setError(''); setDone('') }}>{open ? 'Cancel' : 'Reset password'}</button>
        <button className="btn btn-text-danger btn-sm" onClick={onRemove}>Remove</button>
      </div>
      {open && (
        <form className="enrol" onSubmit={submit} noValidate>
          <Field id={`reset-${member.id}`} label={`New temporary password for ${member.full_name}`} error={error} hint="At least 10 characters, with numbers or symbols.">
            <input id={`reset-${member.id}`} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Set temporary password'}</button>
        </form>
      )}
      {!open && error && <Alert>{error}</Alert>}
      <Alert kind="success">{done}</Alert>
    </>
  )
}

function AddStaff({ onAdded }) {
  const empty = { full_name: '', email: '', password: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (form.full_name.trim().length < 2) errs.full_name = 'Enter their name.'
    if (!isEmail(form.email.trim())) errs.email = 'Enter a valid email address.'
    const pw = passwordProblem(form.password)
    if (pw) errs.password = pw
    setErrors(errs)
    setError('')
    setDone('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const member = await team.add({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password })
      onAdded(member)
      setDone(`${member.full_name} can now log in with ${member.email} and the temporary password you set. Share it with them in person; they’ll have to choose their own password when they first log in.`)
      setForm(empty)
    } catch (err) {
      setError(err.message)
      setErrors(err.fields || {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>Add staff</h2>
      <p className="small muted">For managers, cashiers and admin staff who receive payment or cash requests.</p>
      <Alert>{error}</Alert>
      <Alert kind="success">{done}</Alert>
      <Field id="s-name" label="Full name" error={errors.full_name}>
        <input id="s-name" value={form.full_name} onChange={set('full_name')} aria-invalid={!!errors.full_name} />
      </Field>
      <Field id="s-email" label="Work email" error={errors.email}>
        <input id="s-email" type="email" autoComplete="off" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
      </Field>
      <Field id="s-pw" label="Temporary password" error={errors.password} hint="At least 10 characters, with numbers or symbols.">
        <input id="s-pw" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add staff member'}</button>
    </form>
  )
}
