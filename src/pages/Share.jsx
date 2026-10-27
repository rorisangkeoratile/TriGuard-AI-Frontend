import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// PWA share target: /share?title=...&text=...&url=...
// Combines the shared fields and opens Home on the Message tab, prefilled.
export default function Share() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const text = [params.get('title'), params.get('text'), params.get('url')]
      .filter(Boolean)
      .join('\n')
    navigate('/', { replace: true, state: { tab: 'message', text } })
  }, [params, navigate])

  return <p className="muted">Opening message…</p>
}
