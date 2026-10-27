import { Link, useLocation, useNavigate } from 'react-router-dom'
import VerdictCard from '../components/VerdictCard.jsx'
import RiskMeter from '../components/RiskMeter.jsx'
import ReasonList from '../components/ReasonList.jsx'

// Placeholder: shows the result passed from Home via router state.
export default function Result() {
  const { state } = useLocation()
  const navigate = useNavigate()

  if (!state?.result) {
    return (
      <div className="stack">
        <p>No result to show yet.</p>
        <Link className="btn btn-primary" to="/">Start a check</Link>
      </div>
    )
  }

  const { result, type, input } = state

  return (
    <div className="stack">
      <VerdictCard verdict={result.verdict} subject={input} />
      <RiskMeter verdict={result.verdict} score={result.score} />
      <ReasonList reasons={result.reasons} />

      <div className="stack">
        <button
          className="btn btn-danger btn-block"
          type="button"
          onClick={() => navigate('/report', { state: { number: type === 'number' ? input : '' } })}
        >
          Report
        </button>
        <button className="btn btn-secondary btn-block" type="button" onClick={() => alert('Block: coming soon')}>
          Block
        </button>
        <button className="btn btn-secondary btn-block" type="button" onClick={() => alert('Thanks for the feedback')}>
          Not a scam
        </button>
      </div>
    </div>
  )
}
