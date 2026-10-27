// Placeholder: lights up the segment matching the verdict.
const SEGMENTS = ['safe', 'suspicious', 'scam']

export default function RiskMeter({ verdict, score }) {
  return (
    <div className="risk-meter">
      <div className="risk-meter__bar" role="img" aria-label={`Risk score ${score} out of 100, ${verdict}`}>
        {SEGMENTS.map((s) => (
          <span key={s} className={`risk-meter__seg risk-meter__seg--${s} ${s === verdict ? 'is-active' : ''}`} />
        ))}
      </div>
      <div className="risk-meter__labels" aria-hidden="true">
        <span>Safe</span>
        <span>Suspicious</span>
        <span>Scam</span>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>Risk score {score} / 100</p>
    </div>
  )
}
