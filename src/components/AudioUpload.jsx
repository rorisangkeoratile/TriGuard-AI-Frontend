export default function AudioUpload({ file, onChange }) {
  return (
    <div>
      <label className="label" htmlFor="check-voice">Voice note (.ogg, .mp3, .wav)</label>
      <input
        id="check-voice"
        className="input"
        type="file"
        accept=".ogg,.mp3,.wav,audio/ogg,audio/mpeg,audio/wav"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && <p className="small muted" style={{ marginTop: 8 }}>Selected: {file.name}</p>}
    </div>
  )
}
