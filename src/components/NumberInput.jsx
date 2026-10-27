export default function NumberInput({ value, onChange }) {
  return (
    <div>
      <label className="label" htmlFor="check-number">Phone number</label>
      <input
        id="check-number"
        className="input"
        type="tel"
        inputMode="tel"
        placeholder="e.g. 082 123 4567"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
