import { Link } from 'react-router-dom'
import { dashboard } from '../../api/index.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Alert, Empty, Spinner } from '../../components/ui.jsx'
import { useLoad } from '../../lib/useLoad.js'
import CheckTable from './CheckTable.jsx'

export default function Overview() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useLoad(() => dashboard.summary())
  const firstName = user.full_name.split(' ')[0]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Hi {firstName}</h1>
          <p className="page-sub">Got a voice note or message asking for money? Check it before anyone pays.</p>
        </div>
        <Link className="btn btn-accent" to="/app/check">New check</Link>
      </div>

      {loading && <Spinner />}
      {error && <Alert>{error.message} <button className="link-btn" onClick={reload}>Try again</button></Alert>}

      {data && (
        <>
          <div className="stats">
            <Stat label="Checks this month" value={data.checks_this_month} />
            <Stat label="High risk caught" value={data.high_risk_this_month} tone="high" />
            <Stat label="Waiting for a call-back" value={data.awaiting_callback} tone="medium" to="/app/checks?callback=pending" />
            <Stat label="Payments released" value={data.released_this_month} tone="low" />
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Recent checks</h2>
              <Link to="/app/checks" className="link">See all</Link>
            </div>
            {data.recent.length ? (
              <CheckTable rows={data.recent} />
            ) : (
              <Empty title="No checks yet" action={<Link className="btn btn-primary" to="/app/check">Run your first check</Link>}>
                Start by adding the people who can ask for payments under Trusted contacts, then check your first voice note.
              </Empty>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone, to }) {
  const body = (
    <>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </>
  )
  return to && value > 0
    ? <Link to={to} className={`stat stat-${tone || 'plain'} stat-link`}>{body}</Link>
    : <div className={`stat stat-${tone || 'plain'}`}>{body}</div>
}
