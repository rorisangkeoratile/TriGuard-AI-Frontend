export default function MessageInput({ value, onChange }) {
  return (
    <div>
      <label className="label" htmlFor="check-message">SMS or WhatsApp message</label>
      <textarea
        id="check-message"
        className="textarea"
        placeholder="Paste the message here"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
