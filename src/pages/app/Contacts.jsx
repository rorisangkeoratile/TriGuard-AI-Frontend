import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { contacts } from '../../api/index.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, Empty, Field, Spinner } from '../../components/ui.jsx'
import { AUDIO_ACCEPT, MAX_UPLOAD_MB, isPhone, normalisePhone } from '../../lib/format.js'
import { useLoad } from '../../lib/useLoad.js'

export default function Contacts() {
  const location = useLocation()
  const { user } = useAuth()
  const isOwner = user.role === 'owner'
  const { data, error, loading, setData } = useLoad(() => contacts.list())
  const list = data || []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Trusted contacts</h1>
          <p className="page-sub">The people who can ask for payments, with the numbers you know are really theirs. TriGuard uses these for call-backs.{!isOwner && ' Only the store owner can change them.'}</p>
        </div>
      </div>

      {location.state?.welcome && (
        <Alert kind="info">Welcome to TriGuard. Start by adding the people who usually ask your store for payments or cash, like the owner, head office, area manager and key suppliers.</Alert>
      )}

      <div className="contacts-grid">
        {isOwner ? <AddContact onAdded={c => setData([...list, c])} /> : (
          <section className="card">
            <h2>Add a contact</h2>
            <p className="muted">Only the store owner can add, change or remove trusted contacts. That way nobody can swap a number for a scammer’s. If a number is wrong or missing, ask your store owner.</p>
          </section>
        )}
        <section className="card">
          <h2>Saved contacts</h2>
          {loading && <Spinner />}
          {error && <Alert>{error.message}</Alert>}
          {data && (list.length ? (
            <ul className="contact-list">
              {list.map(c => (
                <ContactRow key={c.id} contact={c} canEdit={isOwner}
                  onChange={u => setData(list.map(x => (x.id === u.id ? u : x)))}
                  onRemoved={() => setData(list.filter(x => x.id !== c.id))} />
              ))}
            </ul>
          ) : <Empty title="No trusted contacts yet">{isOwner ? 'Add the first person on the left.' : 'Ask your store owner to add them.'}</Empty>)}
        </section>
      </div>
    </div>
  )
}

function AddContact({ onAdded }) {
  const [form, setForm] = useState({ name: '', role_title: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Enter their name.'
    if (!isPhone(form.phone)) errs.phone = 'Enter a number like 082 555 0143.'
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      onAdded(await contacts.add({ name: form.name.trim(), role_title: form.role_title.trim(), phone: normalisePhone(form.phone) }))
      setForm({ name: '', role_title: '', phone: '' })
    } catch (err) {
      setError(err.message)
      setErrors(err.fields || {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>Add a contact</h2>
      <Alert>{error}</Alert>
      <Field id="c-name" label="Name" error={errors.name}>
        <input id="c-name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
      </Field>
      <Field id="c-role" label="Role" hint="e.g. Store owner, Area manager, Head office, Supplier rep">
        <input id="c-role" value={form.role_title} onChange={set('role_title')} />
      </Field>
      <Field id="c-phone" label="Phone number you know is theirs" error={errors.phone} hint="Take it from your own records, never from a message asking for money.">
        <input id="c-phone" inputMode="tel" placeholder="082 555 0143" value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add contact'}</button>
    </form>
  )
}

function ContactRow({ contact, canEdit, onChange, onRemoved }) {
  const [enrolling, setEnrolling] = useState(false)
  const [file, setFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function run(key, fn) {
    setBusy(key)
    setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy('') }
  }

  const enrol = () => run('enrol', async () => {
    if (!file) throw new Error('Choose a recording of their voice.')
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`The file is bigger than ${MAX_UPLOAD_MB} MB.`)
    if (!consent) throw new Error('You need their consent first.')
    onChange(await contacts.enrolVoice(contact.id, file))
    setEnrolling(false)
    setFile(null)
    setConsent(false)
  })

  const removeVoice = () => run('rmvoice', async () => {
    if (!window.confirm(`Delete ${contact.name}’s voiceprint?`)) return
    await contacts.removeVoice(contact.id)
    onChange({ ...contact, has_voiceprint: false })
  })

  const remove = () => run('remove', async () => {
    if (!window.confirm(`Remove ${contact.name} from trusted contacts?`)) return
    await contacts.remove(contact.id)
    onRemoved()
  })

  return (
    <li className="contact">
      <div className="contact-main">
        <div>
          <b>{contact.name}</b>{contact.role_title && <span className="muted"> · {contact.role_title}</span>}
          <div className="mono small">{contact.phone}</div>
        </div>
        <span className={`badge ${contact.has_voiceprint ? 'cb-confirmed' : 'cb-none'}`}>{contact.has_voiceprint ? 'Voiceprint saved' : 'No voiceprint'}</span>
      </div>
      {canEdit && <div className="btn-row">
        {contact.has_voiceprint
          ? <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={removeVoice}>Delete voiceprint</button>
          : <button className="btn btn-outline btn-sm" onClick={() => setEnrolling(e => !e)}>{enrolling ? 'Cancel' : 'Add voiceprint'}</button>}
        <button className="btn btn-text-danger btn-sm" disabled={!!busy} onClick={remove}>Remove</button>
      </div>}
      {enrolling && (
        <div className="enrol">
          <p className="small">Upload 20–60 seconds of {contact.name} speaking normally, for example a voice note they sent you. TriGuard keeps only a voiceprint, not the recording.</p>
          <input type="file" accept={AUDIO_ACCEPT} onChange={e => setFile(e.target.files[0] || null)} aria-label={`Recording of ${contact.name}`} />
          <label className="check-inline">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>{contact.name} has agreed that TriGuard may keep a voiceprint to check voice notes that claim to be from them (POPIA consent).</span>
          </label>
          <button className="btn btn-primary btn-sm" disabled={busy === 'enrol'} onClick={enrol}>{busy === 'enrol' ? 'Saving voiceprint…' : 'Save voiceprint'}</button>
        </div>
      )}
      <Alert>{error}</Alert>
    </li>
  )
}
