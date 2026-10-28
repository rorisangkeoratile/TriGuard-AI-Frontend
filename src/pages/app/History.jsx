import { Link, useSearchParams } from 'react-router-dom'
import { checks } from '../../api/index.js'
import { Alert, Empty, Spinner } from '../../components/ui.jsx'
import { useLoad } from '../../lib/useLoad.js'
import CheckTable from './CheckTable.jsx'

const PAGE = 20

export default function History() {
  const [params, setParams] = useSearchParams()
  const level = params.get('level') || ''
  const callback = params.get('callback') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const { data, error, loading } = useLoad(
    () => checks.list({ level, callback, limit: PAGE, offset: (page - 1) * PAGE }),
    [level, callback, page]
  )

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>History</h1>
          <p className="page-sub">Every check, call-back and payment decision, with who did what.</p>
        </div>
        <Link className="btn btn-accent" to="/app/check">New check</Link>
      </div>

      <div className="filters">
        <label>Risk
          <select value={level} onChange={e => update('level', e.target.value)}>
            <option value="">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </label>
        <label>Call-back
          <select value={callback} onChange={e => update('callback', e.target.value)}>
            <option value="">All</option><option value="pending">Needed</option><option value="confirmed">Confirmed</option>
            <option value="denied">Denied</option><option value="no_answer">No answer</option>
          </select>
        </label>
      </div>

      <section className="card">
        {loading && <Spinner />}
        {error && <Alert>{error.message}</Alert>}
        {data && (data.items.length ? <CheckTable rows={data.items} /> : (
          <Empty title={level || callback ? 'No checks match these filters' : 'No checks yet'}>
            {level || callback ? 'Try clearing the filters.' : 'Checks you run will appear here.'}
          </Empty>
        ))}
        {data && pages > 1 && (
          <div className="pager">
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>Previous</button>
            <span className="small muted">Page {page} of {pages} · {data.total} checks</span>
            <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => update('page', String(page + 1))}>Next</button>
          </div>
        )}
      </section>
    </div>
  )
}
