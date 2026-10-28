import { useNavigate } from 'react-router-dom'
import { CallbackBadge, DecisionBadge, RiskBadge } from '../../components/ui.jsx'
import { formatWhen } from '../../lib/format.js'

export default function CheckTable({ rows }) {
  const navigate = useNavigate()
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>When</th><th>From</th><th>What it says</th><th>Risk</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} onClick={() => navigate(`/app/checks/${r.id}`)} className="row-link">
              <td className="nowrap">{formatWhen(r.created_at)}</td>
              <td>
                <a href={`/app/checks/${r.id}`} onClick={e => { e.preventDefault(); navigate(`/app/checks/${r.id}`) }}>{r.sender}</a>
                <div className="muted small">{r.kind === 'voice' ? 'Voice note' : 'Text message'}</div>
              </td>
              <td className="clip">{r.headline}</td>
              <td><RiskBadge level={r.level} /></td>
              <td><div className="badges">{r.decision !== 'none' ? <DecisionBadge decision={r.decision} /> : <CallbackBadge status={r.callback_status} />}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
