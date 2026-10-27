import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { reportScam } from '../services/api.js'

const CHANNELS = ['Call', 'SMS', 'WhatsApp']
const SCAM_TYPES = ['Banking / OTP', 'Fake delivery', 'Job offer', 'Prize / lottery', 'Family emergency', 'AI voice clone', 'Other']

// Placeholder: functional form, full design comes later.
export default function Report() {
  const { state } = useLocation()
  const [number, setNumber] = useState(state?.number ?? '')
  const [channel, setChannel] = useState('Call')
  const [scamType, setScamType] = useState(SCAM_TYPES[0])
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Sending…')
    try {
      const res = await reportScam({ number, channel, scamType, message, anonymous })
      setStatus(res.message || 'Report sent.')
    } catch (err) {
      setStatus(err.message || 'Could not send report.')
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h1>Report a scam</h1>

      <div>
        <label className="label" htmlFor="report-number">Phone number</label>
        <input id="report-number" className="input" type="tel" required value={number} onChange={(e) => setNumber(e.target.value)} />
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">How did they contact you?</legend>
        <div className="chip-row">
          {CHANNELS.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={channel === c} onClick={() => setChannel(c)}>
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="report-type">Scam type</label>
        <select id="report-type" className="select" value={scamType} onChange={(e) => setScamType(e.target.value)}>
          {SCAM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="report-message">Message (optional)</label>
        <textarea id="report-message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        Report anonymously
      </label>

      <button className="btn btn-primary btn-block" type="submit">Send report</button>
      {status && <p role="status">{status}</p>}
    </form>
  )
}
