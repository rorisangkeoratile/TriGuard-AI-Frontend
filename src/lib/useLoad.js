import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

// Loads data for a page. If the session has expired, it sends the user back to log in.
export function useLoad(loader, deps = []) {
  const { refresh } = useAuth()
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const load = useCallback(loader, deps)

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      setState({ data: await load(), error: null, loading: false })
    } catch (err) {
      if (err.status === 401) refresh()
      setState({ data: null, error: err, loading: false })
    }
  }, [load, refresh])

  useEffect(() => { reload() }, [reload])

  return { ...state, reload, setData: data => setState(s => ({ ...s, data })) }
}
