import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { Logo } from '../../components/ui.jsx'
import ChangePassword from './ChangePassword.jsx'

const ICONS = {
  overview: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  check: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  history: 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  contacts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6',
  security: 'M12 2.5l8 3v6.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V5.5zM9.5 11V9.5a2.5 2.5 0 0 1 5 0V11M8.5 11h7v5h-7z',
}

const Icon = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [location.pathname])

  const links = [
    ['/app', 'Overview', ICONS.overview, true],
    ['/app/check', 'New check', ICONS.check],
    ['/app/checks', 'History', ICONS.history],
    ['/app/contacts', 'Trusted contacts', ICONS.contacts],
    ['/app/team', 'Team', ICONS.team],
    ['/app/security', 'Security', ICONS.security],
  ]

  // Leave the dashboard first, or the logged-out guard would redirect to /login instead of home.
  async function signOut() {
    navigate('/', { replace: true })
    await logout()
  }

  // Erases every account, contact and check stored by demo mode in this browser.
  return (
    <div className="shell">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <Link to="/app" aria-label="Dashboard"><Logo light /></Link>
          <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-controls="side-nav">
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        <nav id="side-nav" className="side-nav">
          {!user.must_change_password && links.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
              <Icon d={icon} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div className="side-user-name">{user.full_name}</div>
          <div className="side-user-meta">{user.company} · {user.role === 'owner' ? 'Owner' : 'Staff'}</div>
          <button className="btn btn-ghost-light btn-sm" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <main className="main">
        {user.must_change_password ? (
          <div className="page page-narrow"><ChangePassword forced /></div>
        ) : <>
        {user.pending_devices > 0 && location.pathname !== '/app/security' && (
          <div className="alert alert-warn notice-bar">
            {user.pending_devices === 1 ? 'A new device is' : `${user.pending_devices} new devices are`} waiting for your approval. <Link to="/app/security">Review</Link>
          </div>
        )}
        {(!user.has_pin || user.pin_locked) && location.pathname !== '/app/security' && (
          <div className="alert alert-info notice-bar">
            {user.pin_locked ? 'Your payment PIN is locked.' : 'Set a payment PIN: you’ll need it every time you release a payment.'} <Link to="/app/security">{user.pin_locked ? 'Set a new PIN' : 'Set PIN'}</Link>
          </div>
        )}
        <Outlet />
        </>}
      </main>
    </div>
  )
}
