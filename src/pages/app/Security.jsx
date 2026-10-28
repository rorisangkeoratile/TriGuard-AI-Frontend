import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, devices } from '../../api/index.js'
import { DEMO_MODE } from '../../api/client.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, Field, Spinner } from '../../components/ui.jsx'
import { DEVICE_STATUS_LABEL, formatWhen, pinProblem } from '../../lib/format.js'
import { useLoad } from '../../lib/useLoad.js'
import ChangePassword from './ChangePassword.jsx'

const STATUS_CLASS = { approved: 'cb-confirmed', pending: 'cb-pending', blocked: 'cb-denied' }

// Two-step sign-in with an authenticator app (Microsoft or Google Authenticator). A code from the app is needed
// after the password, so a stolen or guessed password alone can't open TriGuard. No SMS: a SIM swap can't steal it.
function TotpCard() {
  const { user, refresh } = useAuth()
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState(null) // { secret, qr }
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    setError('')
    setDone('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const start = e => {
    e.preventDefault()
    run(async () => {
      const { secret, otpauth_url } = await auth.totpSetup(password)
      const QRCode = await import('qrcode')
      setSetup({ secret, qr: await QRCode.toDataURL(otpauth_url, { margin: 1, width: 200 }) })
      setPassword('')
    })
  }
  const enable = e => {
    e.preventDefault()
    run(async () => {
      await auth.totpEnable(code.trim())
      setSetup(null)
      setCode('')
      setDone('Sign-in codes are on. Next time you log in, TriGuard will ask for a code from your app.')
      await refresh()
    })
  }
  const disable = e => {
    e.preventDefault()
    if (!window.confirm('Turn off sign-in codes? Your password alone will then open TriGuard.')) return
    run(async () => {
      await auth.totpDisable(password)
      setPassword('')
      setDone('Sign-in codes are off.')
      await refresh()
    })
  }

  const passwordField = (
    <Field id="totp-password" label="Your account password">
      <input id="totp-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
    </Field>
  )

  return (
    <section className="card form">
      <div className="card-head">
        <h2>Sign-in codes</h2>
        <span className={`badge ${user.has_totp ? 'cb-confirmed' : 'cb-pending'}`}>{user.has_totp ? 'On' : 'Off'}</span>
      </div>
      <p className="small muted">
        After your password, TriGuard asks for a 6-digit code from Microsoft Authenticator or Google Authenticator on
        your phone. A stolen password alone can’t open your account, and because there’s no SMS, a SIM swap can’t steal the code.
      </p>
      <Alert>{error}</Alert>
      <Alert kind="success">{done}</Alert>
      {user.has_totp ? (
        <form onSubmit={disable} noValidate className="form">
          {passwordField}
          <button className="btn btn-text-danger btn-sm" disabled={busy}>Turn off sign-in codes</button>
        </form>
      ) : setup ? (
        <form onSubmit={enable} noValidate className="form">
          <ol className="small">
            <li>In your authenticator app, add an account (in Microsoft Authenticator: <b>+</b> › <b>Other account</b>) and scan this code.</li>
            <li>Type the 6-digit code the app shows for TriGuard AI.</li>
          </ol>
          <img src={setup.qr} width="200" height="200" alt="QR code to add TriGuard AI to your authenticator app" />
          <p className="small muted">Can’t scan? Enter this key instead: <code>{setup.secret.match(/.{1,4}/g).join(' ')}</code></p>
          <Field id="totp-code" label="Code from the app">
            <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Turn on'}</button>
        </form>
      ) : (
        <form onSubmit={start} noValidate className="form">
          {passwordField}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Starting…' : 'Set up sign-in codes'}</button>
        </form>
      )}
    </section>
  )
}

// Accounts, contacts and checks are kept in this browser. Anyone can erase them (POPIA: the right to deletion).
function BrowserDataCard() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function erase() {
    if (!window.confirm('Delete all TriGuard data stored in this browser? Every account, contact and check here will be erased.')) return
    const { resetDemo } = await import('../../api/demo.js')
    navigate('/', { replace: true })
    resetDemo()
    await logout()
  }

  return (
    <section className="card">
      <h2>Data in this browser</h2>
      <p className="small muted">Your accounts, trusted contacts and checks are stored in this browser only.</p>
      <button className="btn btn-text-danger btn-sm" type="button" onClick={erase}>Delete all data in this browser</button>
    </section>
  )
}

export default function Security() {
  const { user, refresh } = useAuth()
  const isOwner = user.role === 'owner'
  const { data, error, loading, reload } = useLoad(() => devices.list())
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState('')

  async function act(fn, message) {
    setActionError('')
    setDone('')
    try {
      await fn()
      setDone(message)
      reload()
      refresh()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const approve = d => act(() => devices.approve(d.id), `“${d.name}” is approved. ${d.user_name} can now log in on it.`)
  function block(d) {
    const whose = d.user_id === user.id ? 'your' : `${d.user_name}’s`
    if (!window.confirm(`Block ${whose} device “${d.name}”?\n\nUse this if it was lost or stolen. It is signed out within seconds and can’t log in again, even with the right password. This can’t be undone.`)) return
    act(() => devices.block(d.id), `“${d.name}” is blocked and has been signed out.`)
  }

  const list = data || []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Security</h1>
          <p className="page-sub">Only approved people on approved devices can open TriGuard. A lost or stolen device can be blocked in seconds, and every payment release needs your PIN.</p>
        </div>
      </div>

      <div className="contacts-grid">
        <div className="stack">
          <section className="card">
            <h2>This device</h2>
            {user.device ? (
              <dl className="kv">
                <dt>Name</dt><dd>{user.device.name}</dd>
                <dt>Status</dt><dd><span className={`badge ${STATUS_CLASS[user.device.status]}`}>{DEVICE_STATUS_LABEL[user.device.status]}</span></dd>
                <dt>Set up</dt><dd>{formatWhen(user.device.created_at)}</dd>
              </dl>
            ) : <p className="muted">No device information.</p>}
            <p className="small muted">This browser is recognised by a random device key. If it’s lost or stolen, the store owner can block it.</p>
          </section>
          <TotpCard />
          <PinCard />
          <ChangePassword />
          {DEMO_MODE && <BrowserDataCard />}
        </div>

        <section className="card">
          <h2>{isOwner ? 'Store devices' : 'Your devices'}</h2>
          <p className="small muted">
            {isOwner
              ? 'Approve new phones and computers for your staff. If one is lost or stolen, block it: it is signed out within seconds.'
              : 'If one of your devices is lost or stolen, block it here from another device, or ask your store owner.'}
          </p>
          {loading && !data && <Spinner />}
          {error && <Alert>{error.message}</Alert>}
          <Alert>{actionError}</Alert>
          <Alert kind="success">{done}</Alert>
          <ul className="contact-list">
            {list.map(d => (
              <li key={d.id} className={`contact device-${d.status}`}>
                <div className="contact-main">
                  <div>
                    <b>{d.name}</b>{d.current && <span className="muted"> (this device)</span>}
                    <div className="small muted">
                      {isOwner && <>{d.user_name} · </>}
                      {d.status === 'blocked' ? `blocked ${formatWhen(d.blocked_at)}` : d.last_used_at ? `last used ${formatWhen(d.last_used_at)}` : `set up ${formatWhen(d.created_at)}`}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_CLASS[d.status]}`}>{DEVICE_STATUS_LABEL[d.status]}</span>
                </div>
                {d.status !== 'blocked' && !d.current && (
                  <div className="btn-row">
                    {isOwner && d.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => approve(d)}>Approve</button>}
                    <button className="btn btn-text-danger btn-sm" onClick={() => block(d)}>{d.status === 'pending' ? 'Reject and block' : 'Lost or stolen? Block'}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function PinCard() {
  const { user, refresh } = useAuth()
  const empty = { pin: '', confirm: '', password: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: key === 'password' ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6) }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    const problem = pinProblem(form.pin)
    if (problem) errs.pin = problem
    if (form.confirm !== form.pin) errs.confirm = 'The PINs don’t match.'
    if (!DEMO_MODE && !form.password) errs.password = 'Enter your account password.'
    setErrors(errs)
    setError('')
    setDone('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await auth.setPin(form.pin, form.password)
      setForm(empty)
      setDone('Your payment PIN is saved. You’ll need it every time you release a payment.')
      refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const state = user.pin_locked ? ['cb-denied', 'Locked'] : user.has_pin ? ['cb-confirmed', 'Set'] : ['cb-pending', 'Not set']

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <div className="card-head">
        <h2>Payment PIN</h2>
        <span className={`badge ${state[0]}`}>{state[1]}</span>
      </div>
      <p className="small muted">
        {user.pin_locked
          ? 'Your PIN was locked after 5 wrong tries. Set a new one to release payments again.'
          : 'A 6-digit PIN you type every time you release a payment, so someone holding an unlocked phone still can’t release one. Don’t use your bank or phone PIN.'}
      </p>
      <Alert>{error}</Alert>
      <Alert kind="success">{done}</Alert>
      <div className="form-row">
        <Field id="pin" label={user.has_pin ? 'New PIN' : 'PIN'} error={errors.pin}>
          <input id="pin" type="password" inputMode="numeric" autoComplete="off" value={form.pin} onChange={set('pin')} aria-invalid={!!errors.pin} />
        </Field>
        <Field id="pin-confirm" label="Confirm PIN" error={errors.confirm}>
          <input id="pin-confirm" type="password" inputMode="numeric" autoComplete="off" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        </Field>
      </div>
      <Field id="pin-password" label="Your account password" error={errors.password} hint="So only you can set or change your PIN.">
        <input id="pin-password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : user.has_pin ? 'Change PIN' : 'Set PIN'}</button>
    </form>
  )
}
