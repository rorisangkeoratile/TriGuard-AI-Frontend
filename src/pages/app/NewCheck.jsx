import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checks, contacts as contactsApi } from '../../api/index.js'
import { Alert, Field } from '../../components/ui.jsx'
import { AUDIO_ACCEPT, MAX_UPLOAD_MB, PAYMENT_QUESTIONS, isPhone, normalisePhone } from '../../lib/format.js'
import { useLoad } from '../../lib/useLoad.js'

// POPIA section 10 (minimality): the payment check asks three yes/no questions instead of collecting
// amounts, payee names or bank account numbers, which TriGuard doesn't need.
const EMPTY = { text: '', claimed_contact_id: '', sender_number: '', audio_language: 'en' }
// Languages the voice check has been set up for so far. The rest of the 11 follow once native speakers have tested them.
const SPOKEN_LANGUAGES = [['en', 'English'], ['zu', 'isiZulu'], ['af', 'Afrikaans']]
const NO_ANSWERS = Object.fromEntries(PAYMENT_QUESTIONS.map(([key]) => [key, null]))

export default function NewCheck() {
  const navigate = useNavigate()
  const people = useLoad(() => contactsApi.list())
  const [kind, setKind] = useState('voice')
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [answers, setAnswers] = useState(NO_ANSWERS)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  function validate() {
    const errs = {}
    if (kind === 'voice') {
      if (!file) errs.file = 'Choose the voice note to check.'
      else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) errs.file = `The file is bigger than ${MAX_UPLOAD_MB} MB.`
    } else if (form.text.trim().length < 5) {
      errs.text = 'Paste the message you received.'
    }
    if (form.sender_number && !isPhone(form.sender_number)) errs.sender_number = 'Enter a number like 082 555 0143.'
    return errs
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    setError('')
    if (Object.keys(errs).length) return

    const details = {
      claimed_contact_id: form.claimed_contact_id || null,
      sender_number: form.sender_number ? normalisePhone(form.sender_number) : '',
      ...(kind === 'voice' ? { audio_language: form.audio_language } : {}),
      ...answers,
    }
    setBusy(true)
    abortRef.current = new AbortController()
    try {
      const result = kind === 'voice'
        ? await checks.voice(file, details, abortRef.current.signal)
        : await checks.text({ ...details, text: form.text.trim() })
      navigate(`/app/checks/${result.id}`)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setErrors(err.fields || {})
      setBusy(false)
    }
  }

  const list = people.data || []

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>New check</h1>
          <p className="page-sub">Check a voice note or message before anyone pays a supplier, buys vouchers or hands over cash. Don’t reply to it yet.</p>
        </div>
      </div>

      <Alert>{error}</Alert>

      <form className="card form" onSubmit={submit} noValidate>
        <div className="seg" role="tablist" aria-label="What did you receive?">
          <button type="button" role="tab" aria-selected={kind === 'voice'} className={kind === 'voice' ? 'on' : ''} onClick={() => setKind('voice')}>Voice note</button>
          <button type="button" role="tab" aria-selected={kind === 'text'} className={kind === 'text' ? 'on' : ''} onClick={() => setKind('text')}>Text message</button>
        </div>

        {kind === 'voice' ? (
          <Field id="file" label="Voice note" error={errors.file} hint={`WhatsApp voice notes (OGG/Opus), MP3, M4A or WAV, up to ${MAX_UPLOAD_MB} MB. In WhatsApp: long-press the voice note › Share › Save, then choose it here.`}>
            <label className={`dropzone${file ? ' has-file' : ''}`}>
              <input id="file" type="file" accept={AUDIO_ACCEPT} onChange={e => setFile(e.target.files[0] || null)} aria-invalid={!!errors.file} />
              {file ? (
                <span><b>{file.name}</b> · {(file.size / 1024 / 1024).toFixed(1)} MB <span className="link">Change</span></span>
              ) : (
                <span><b>Choose a voice note</b> or drag it here</span>
              )}
            </label>
            {previewUrl && <audio className="preview-audio" controls src={previewUrl} />}
          </Field>
        ) : null}
        {kind === 'voice' ? (
          <Field id="audio_language" label="Language spoken" hint="TriGuard writes down what was said in this language and translates it into English.">
            <select id="audio_language" value={form.audio_language} onChange={set('audio_language')}>
              {SPOKEN_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </Field>
        ) : (
          <Field id="text" label="The message" error={errors.text} hint="Paste the SMS or WhatsApp message exactly as you got it.">
            <textarea id="text" rows={5} value={form.text} onChange={set('text')} aria-invalid={!!errors.text} />
          </Field>
        )}

        <h2 className="form-section">Who sent it?</h2>
        <div className="form-row">
          <Field id="claimed" label="It says it’s from" hint={list.length ? '' : 'Add trusted contacts to compare their number and voice.'}>
            <select id="claimed" value={form.claimed_contact_id} onChange={set('claimed_contact_id')}>
              <option value="">Someone else / not sure</option>
              {list.map(c => <option key={c.id} value={c.id}>{c.name}{c.role_title ? ` (${c.role_title})` : ''}</option>)}
            </select>
          </Field>
          <Field id="sender_number" label="Number it came from" error={errors.sender_number} hint="Optional">
            <input id="sender_number" inputMode="tel" placeholder="082 555 0143" value={form.sender_number} onChange={set('sender_number')} aria-invalid={!!errors.sender_number} />
          </Field>
        </div>
        {!list.length && !people.loading && <p className="small muted">No trusted contacts yet. <Link to="/app/contacts">Add the people who can ask for payments</Link>.</p>}

        <h2 className="form-section">About the payment <span className="muted small">(answer what you can; each “yes” raises the risk)</span></h2>
        <div className="questions">
          {PAYMENT_QUESTIONS.map(([key, question]) => (
            <fieldset key={key} className="question">
              <legend>{question}</legend>
              <div className="yesno">
                {[[true, 'Yes'], [false, 'No']].map(([value, label]) => (
                  <label key={label} className={answers[key] === value ? 'on' : ''}>
                    <input type="radio" name={key} checked={answers[key] === value}
                      onChange={() => setAnswers(a => ({ ...a, [key]: value }))} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? <><span className="spinner spinner-light" aria-hidden="true" />{kind === 'voice' ? 'Checking the voice… this can take a minute' : 'Checking…'}</> : 'Run check'}
          </button>
        </div>
      </form>
    </div>
  )
}
