import { CALLBACK_LABEL, DECISION_LABEL, LEVEL_LABEL } from '../lib/format.js'

export function Logo({ light = false }) {
  return (
    <span className={`logo${light ? ' light' : ''}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2.5l11 4v8.3c0 6.9-4.6 11.8-11 14.7-6.4-2.9-11-7.8-11-14.7V6.5z" fill="currentColor" />
        <path d="M9 16h2.5l2-5 3 10 2.5-7 1.5 2H23" fill="none" stroke="var(--logo-wave)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      TriGuard <b>AI</b>
    </span>
  )
}

export function RiskBadge({ level, score }) {
  return (
    <span className={`badge risk-${level}`}>
      {LEVEL_LABEL[level] || level}
      {score != null && <span className="badge-score">{score}/100</span>}
    </span>
  )
}

export function CallbackBadge({ status }) {
  return <span className={`badge cb-${status}`}>{CALLBACK_LABEL[status] || status}</span>
}

export function DecisionBadge({ decision }) {
  if (!decision || decision === 'none') return null
  return <span className={`badge dec-${decision}`}>{DECISION_LABEL[decision]}</span>
}

export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null
  return <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="page-loading"><span className="spinner" aria-hidden="true" />{label}</div>
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
