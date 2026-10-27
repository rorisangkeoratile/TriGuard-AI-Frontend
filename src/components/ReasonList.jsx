export default function ReasonList({ reasons = [] }) {
  return (
    <div className="card">
      <h3>Why we flagged this</h3>
      <ul>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
