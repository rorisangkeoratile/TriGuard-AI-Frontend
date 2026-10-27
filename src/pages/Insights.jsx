import { useEffect, useState } from 'react'
import { getInsights } from '../services/api.js'

// Placeholder: shows raw insight data, full design comes later.
export default function Insights() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getInsights().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  return (
    <div className="stack">
      <h1>Insights</h1>
      <p className="small muted">Sample data</p>

      <div className="card">
        <p>Checks today: {data.stats.checksToday}</p>
        <p>Scams detected: {data.stats.scamsDetected}</p>
        <p style={{ margin: 0 }}>Reports this week: {data.stats.reportsThisWeek}</p>
      </div>

      <div className="card">
        <h3>Top scam types</h3>
        <ul>
          {data.topScamTypes.map((t) => <li key={t.type}>{t.type}: {t.count}</li>)}
        </ul>
      </div>

      <div className="card">
        <h3>Most reported numbers</h3>
        <ul>
          {data.mostReported.map((n) => <li key={n.number}>{n.number} ({n.reports} reports)</li>)}
        </ul>
      </div>
    </div>
  )
}
