import { useState } from 'react'
import VerdictPill from '../components/VerdictPill.jsx'
import useHistory from '../hooks/useHistory.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'scam', label: 'Scam' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'safe', label: 'Safe' },
]

// Placeholder: reads local history, full design comes later.
export default function History() {
  const { items } = useHistory()
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? items : items.filter((i) => i.verdict === filter)

  return (
    <div className="stack">
      <h1>History</h1>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="muted">No checks yet.</p>
      ) : (
        <ul className="list card">
          {shown.map((item) => (
            <li key={item.id} className="list-item">
              <span className="small">{item.input}</span>
              <VerdictPill verdict={item.verdict} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
