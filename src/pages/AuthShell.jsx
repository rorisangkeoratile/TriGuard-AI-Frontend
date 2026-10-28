import { Link } from 'react-router-dom'
import { DEMO_MODE } from '../api/client.js'
import { Logo } from '../components/ui.jsx'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Link to="/" aria-label="TriGuard AI home"><Logo light /></Link>
        <div>
          <p className="auth-quote">“No call-back, no payment.”</p>
          <p className="auth-side-note">TriGuard checks voice notes for AI cloning and makes sure every payment request is confirmed on a trusted number.</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-mobile-logo" aria-label="TriGuard AI home"><Logo /></Link>
          <h1>{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          {DEMO_MODE && <p className="demo-note">Demo mode: any details work, and your account is stored only in this browser.</p>}
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  )
}
