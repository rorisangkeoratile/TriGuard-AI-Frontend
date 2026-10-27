const TABS = [
  { id: 'number', label: 'Number' },
  { id: 'message', label: 'Message' },
  { id: 'voice', label: 'Voice' },
]

export default function CheckTabs({ value, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="What do you want to check?">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="segmented__btn"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
