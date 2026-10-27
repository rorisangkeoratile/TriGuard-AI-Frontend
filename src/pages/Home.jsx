import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CheckTabs from '../components/CheckTabs.jsx'
import NumberInput from '../components/NumberInput.jsx'
import MessageInput from '../components/MessageInput.jsx'
import AudioUpload from '../components/AudioUpload.jsx'
import VerdictPill from '../components/VerdictPill.jsx'
import useHistory from '../hooks/useHistory.js'
import { checkNumber, checkMessage, checkVoice } from '../services/api.js'

// Placeholder: working check flow, full design comes later.
export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const { items, addCheck } = useHistory()

  const [tab, setTab] = useState(location.state?.tab ?? 'number')
  const [number, setNumber] = useState('')
  const [message, setMessage] = useState(location.state?.text ?? '')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const input = { number, message, voice: file?.name }[tab]
  const canCheck = tab === 'voice' ? !!file : input.trim().length > 0

  async function handleCheck() {
    setLoading(true)
    setError('')
    try {
      let result
      if (tab === 'number') result = await checkNumber(number)
      if (tab === 'message') result = await checkMessage(message)
      if (tab === 'voice') result = await checkVoice(file)
      addCheck({ type: tab, input, verdict: result.verdict, score: result.score })
      navigate('/result', { state: { result, type: tab, input } })
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <h1>Is it a scam?</h1>
      <p className="muted">Check a number, message or voice note before you reply.</p>

      <CheckTabs value={tab} onChange={setTab} />

      {tab === 'number' && <NumberInput value={number} onChange={setNumber} />}
      {tab === 'message' && <MessageInput value={message} onChange={setMessage} />}
      {tab === 'voice' && <AudioUpload file={file} onChange={setFile} />}

      {error && <p role="alert" style={{ color: 'var(--color-scam)' }}>{error}</p>}

      <button className="btn btn-primary btn-block" type="button" disabled={!canCheck || loading} onClick={handleCheck}>
        {loading ? 'Checking…' : 'Check now'}
      </button>

      {items.length > 0 && (
        <section className="card">
          <h3>Recent checks</h3>
          <ul className="list">
            {items.slice(0, 2).map((item) => (
              <li key={item.id} className="list-item">
                <span className="small">{item.input}</span>
                <VerdictPill verdict={item.verdict} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
