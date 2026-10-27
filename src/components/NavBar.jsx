import { NavLink } from 'react-router-dom'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V7" />
      <path d="M17 16v-3" />
    </svg>
  )
}

const links = [
  { to: '/', label: 'Check', Icon: ShieldIcon, end: true },
  { to: '/history', label: 'History', Icon: ClockIcon },
  { to: '/report', label: 'Report', Icon: FlagIcon },
  { to: '/insights', label: 'Insights', Icon: ChartIcon },
]

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Main">
      <ul className="navbar-list">
        {links.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="navbar-link">
              <Icon />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
