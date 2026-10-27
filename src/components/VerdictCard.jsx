import VerdictIcon from './VerdictIcon.jsx'

const COPY = {
  safe: {
    title: 'Looks safe',
    subtitle: 'We found no scam reports or warning signs. Stay alert anyway.',
  },
  suspicious: {
    title: 'Suspicious',
    subtitle: 'Some warning signs. Do not share PINs, OTPs or banking details.',
  },
  scam: {
    title: 'Likely scam',
    subtitle: 'Do not reply, click links or send money. Block and report this.',
  },
}

export default function VerdictCard({ verdict = 'suspicious', subject }) {
  const copy = COPY[verdict] ?? COPY.suspicious

  return (
    <section
      className={`verdict-card verdict-card--${verdict}`}
      aria-live="polite"
      aria-label={`Verdict: ${copy.title}`}
    >
      <div className="verdict-card__head">
        <VerdictIcon verdict={verdict} className="verdict-card__icon" />
        <div>
          <h2 className="verdict-card__title">{copy.title}</h2>
          {subject && <p className="small" style={{ margin: 0 }}>{subject}</p>}
        </div>
      </div>
      <p className="verdict-card__subtitle">{copy.subtitle}</p>
    </section>
  )
}
