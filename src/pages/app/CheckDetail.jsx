import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { checks } from '../../api/index.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, CallbackBadge, DecisionBadge, RiskBadge, Spinner } from '../../components/ui.jsx'
import { CALLBACK_LABEL, PAYMENT_QUESTIONS, formatWhen } from '../../lib/format.js'
import { useLoad } from '../../lib/useLoad.js'

const GUARD_NAMES = {
  voice_clone: 'AI-voice detector',
  voice_match: 'Voiceprint match',
  transcription: 'Transcription',
  words: 'Scam-script check',
  payment: 'Payment check',
  file_safety: 'File safety',
}
const GUARD_TAG = { voice: 'Voice', words: 'Words', payment: 'Payment', file: 'File' }
const STATUS_LABEL = { ran: 'Checked', skipped: 'Not needed', unavailable: 'Not available', error: 'Failed' }

const HEADLINE = {
  high: 'Treat this as a scam until it’s confirmed.',
  medium: 'Some things don’t add up. Confirm before acting.',
  low: 'No warning signs found. That doesn’t prove it’s genuine.',
}

export default function CheckDetail() {
  const { id } = useParams()
  const { data: check, error, loading, setData } = useLoad(() => checks.get(id), [id])

  if (loading) return <div className="page"><Spinner label="Loading the check…" /></div>
  if (error) return <div className="page"><Alert>{error.status === 404 ? 'This check doesn’t exist.' : error.message}</Alert><Link to="/app/checks">Back to history</Link></div>

  const reasons = check.signals.filter(s => s.points > 0)
  const notes = check.signals.filter(s => s.points <= 0)
  const who = check.claimed_contact

  return (
    <div className="page">
      <Link to="/app/checks" className="back">‹ All checks</Link>

      <section className={`verdict verdict-${check.level}`}>
        <div className="verdict-top">
          <RiskBadge level={check.level} score={check.score} />
          <span className="muted small">{check.kind === 'voice' ? 'Voice note' : 'Text message'} · checked {formatWhen(check.created_at)} by {check.created_by_name}</span>
        </div>
        <h1>{HEADLINE[check.level]}</h1>
        <p className="verdict-text">{check.explanation}</p>
        <div className="meter" aria-hidden="true"><i style={{ width: `${check.score}%` }} /></div>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <CallbackPanel check={check} onChange={setData} />

          <section className="card">
            <h2>Why TriGuard flagged this</h2>
            {reasons.length ? (
              <ul className="reasons">
                {reasons.map(s => (
                  <li key={s.id}>
                    <span className={`tag tag-${s.guard}`}>{GUARD_TAG[s.guard] || s.guard}</span>
                    <span>{s.text}</span>
                    <span className="pts">+{s.points}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No warning signs were found.</p>}
            {notes.length > 0 && (
              <ul className="notes">{notes.map(s => <li key={s.id}>{s.text}</li>)}</ul>
            )}
          </section>

          <section className="card">
            <h2>{check.kind === 'voice' ? 'What the voice note says' : 'The message'}</h2>
            {check.content ? <blockquote className="quote">{check.content}</blockquote> : <p className="muted">No transcript is available for this voice note.</p>}
            {check.language && <p className="small muted">Language: {check.language}</p>}
            {check.content_english && (
              <>
                <h3 className="small">In English</h3>
                <blockquote className="quote">{check.content_english}</blockquote>
                <p className="small muted">Translated by AI. Ask someone who speaks the language if anything is unclear.</p>
              </>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card">
            <h2>Sender</h2>
            <dl className="kv">
              <dt>Says it’s from</dt><dd>{who ? `${who.name}${who.role_title ? ` (${who.role_title})` : ''}` : 'Not specified'}</dd>
              <dt>Came from</dt><dd>{check.sender_number || 'Not given'}</dd>
              {who && <><dt>Saved number</dt><dd>{who.phone}</dd></>}
            </dl>
          </section>

          <section className="card">
            <h2>About the payment</h2>
            <ul className="answers">
              {PAYMENT_QUESTIONS.map(([key, question]) => {
                const a = check.payment_answers?.[key]
                return (
                  <li key={key}>
                    <span>{question}</span>
                    <b className={a === true ? 'ans-yes' : a === false ? 'ans-no' : 'ans-none'}>{a === true ? 'Yes' : a === false ? 'No' : 'Not answered'}</b>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="card">
            <h2>Checks that ran</h2>
            <ul className="guards">
              {Object.entries(check.guards || {}).map(([key, g]) => (
                <li key={key} className={`guard-${g.status}`}>
                  <div className="guard-row"><b>{GUARD_NAMES[key] || key}</b><span className={`gstat gstat-${g.status}`}>{STATUS_LABEL[g.status] || g.status}</span></div>
                  {g.detail && <p>{g.detail}</p>}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function CallbackPanel({ check, onChange }) {
  const { user, refresh } = useAuth()
  const [note, setNote] = useState('')
  const [askPin, setAskPin] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const who = check.claimed_contact
  const decided = check.decision !== 'none'
  const confirmed = check.callback_status === 'confirmed'

  async function run(key, fn) {
    setBusy(key)
    setError('')
    try {
      onChange(await fn())
      setNote('')
      setAskPin(false)
    } catch (err) {
      setError(err.message)
      if (key === 'released') { setPin(''); refresh() } // a wrong PIN may have locked it
    } finally {
      setBusy('')
    }
  }

  const record = outcome => run(outcome, () => checks.callback(check.id, outcome, note.trim()))
  const decide = action => run(action, () => checks.decide(check.id, action))
  // Releasing a payment needs the call-back AND the user's payment PIN.
  function release(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin)) { setError('Enter your 6-digit payment PIN.'); return }
    run('released', () => checks.decide(check.id, 'released', pin))
  }

  return (
    <section className="card callback">
      <div className="card-head">
        <h2>Call back before you pay</h2>
        <div className="badges"><CallbackBadge status={check.callback_status} /><DecisionBadge decision={check.decision} /></div>
      </div>

      {who ? (
        <p>Call <b>{who.name}</b> on the number saved in TriGuard, not the number the message came from.</p>
      ) : (
        <p>Call the person on a number you already had saved, not one from the message. Add them under <Link to="/app/contacts">Trusted contacts</Link> so it’s one tap next time.</p>
      )}
      {who && <a className="btn btn-accent btn-lg call-btn" href={`tel:${who.phone}`}>Call {who.name} · {who.phone}</a>}

      <Alert>{error}</Alert>

      {!decided && (
        <>
          <div className="field">
            <label htmlFor="cb-note">What did they say? <span className="muted">(optional)</span></label>
            <input id="cb-note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Sipho says he never sent it" />
          </div>
          <div className="btn-row">
            <button className="btn btn-outline-low" disabled={!!busy} onClick={() => record('confirmed')}>{busy === 'confirmed' ? 'Saving…' : 'Yes, they confirmed it'}</button>
            <button className="btn btn-outline-high" disabled={!!busy} onClick={() => record('denied')}>{busy === 'denied' ? 'Saving…' : 'No, they didn’t send it'}</button>
            <button className="btn btn-outline" disabled={!!busy} onClick={() => record('no_answer')}>{busy === 'no_answer' ? 'Saving…' : 'No answer'}</button>
          </div>
        </>
      )}

      {check.callback_at && (
        <p className="audit">{CALLBACK_LABEL[check.callback_status]} · recorded by {check.callback_by_name} at {formatWhen(check.callback_at)}{check.callback_note ? ` · “${check.callback_note}”` : ''}</p>
      )}

      {!decided && (
        <div className="decision">
          {askPin ? (
            <form className="pin-form" onSubmit={release}>
              <label htmlFor="release-pin">Payment PIN</label>
              <input id="release-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button className="btn btn-primary" disabled={!!busy}>{busy === 'released' ? 'Checking…' : 'Confirm release'}</button>
              <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => { setAskPin(false); setPin(''); setError('') }}>Cancel</button>
            </form>
          ) : (
            <button className="btn btn-primary" disabled={!confirmed || !!busy} onClick={() => { setError(''); setAskPin(true) }}>Release payment</button>
          )}
          <button className="btn btn-danger" disabled={!!busy} onClick={() => decide('blocked')}>
            {busy === 'blocked' ? 'Saving…' : 'Block payment'}
          </button>
          {!confirmed && <p className="small muted">No call-back, no payment: releasing unlocks once the person confirms on their saved number.</p>}
          {confirmed && !user.has_pin && <p className="small muted">You’ll need a payment PIN to release it. <Link to="/app/security">Set your PIN</Link></p>}
          {confirmed && user.pin_locked && <p className="small muted">Your PIN is locked after too many wrong tries. <Link to="/app/security">Set a new PIN</Link></p>}
        </div>
      )}
      {decided && <p className="audit">{check.decision === 'released' ? 'Released' : 'Blocked'} by {check.decided_by_name} at {formatWhen(check.decided_at)}.</p>}
    </section>
  )
}
