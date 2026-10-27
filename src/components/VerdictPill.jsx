import VerdictIcon from './VerdictIcon.jsx'

const LABELS = { safe: 'Safe', suspicious: 'Suspicious', scam: 'Scam' }

export default function VerdictPill({ verdict }) {
  return (
    <span className={`verdict-pill verdict-pill--${verdict}`}>
      <VerdictIcon verdict={verdict} />
      {LABELS[verdict] ?? verdict}
    </span>
  )
}
