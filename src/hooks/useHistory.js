import { useState, useCallback } from 'react'

const KEY = 'triguard.history'
const MAX_ITEMS = 50

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Storage may be full or blocked (private mode). History just won't persist.
  }
}

export default function useHistory() {
  const [items, setItems] = useState(load)

  const addCheck = useCallback((check) => {
    setItems((prev) => {
      const entry = { id: crypto.randomUUID(), checkedAt: new Date().toISOString(), ...check }
      const next = [entry, ...prev].slice(0, MAX_ITEMS)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setItems([])
  }, [])

  return { items, addCheck, clear }
}
