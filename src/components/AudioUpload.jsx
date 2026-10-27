export default function AudioUpload({ file, onChange }) {
  return (
    <div>
      <label className="label" htmlFor="check-voice">Voice note (.ogg, .opus, .m4a, .mp3, .wav)</label>
      <input
        id="check-voice"
        className="input"
        type="file"
        accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.webm"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && <p className="small muted" style={{ marginTop: 8 }}>Selected: {file.name}</p>}
    </div>
  )
}
