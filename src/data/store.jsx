import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { loadInitial, loadPrevious, saveData, savePrevious } from './storage'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [initial] = useState(() => loadInitial())
  const [data, setData] = useState(initial.data)
  const dataRef = useRef(initial.data)
  const [loadWarning, setLoadWarning] = useState(initial.warning)
  const [saveError, setSaveError] = useState(null)
  const [toast, setToast] = useState(null)

  // update takes a pure function (data) => newData, applies it and saves to localStorage.
  const update = useCallback((fn) => {
    const next = fn(dataRef.current)
    if (next === dataRef.current) return
    dataRef.current = next
    setData(next)
    const result = saveData(next)
    setSaveError(result.ok ? null : result.error)
  }, [])

  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() })
  }, [])

  // Replaces everything. The current data is first kept as a safety copy; on any failure nothing changes.
  const replaceAll = useCallback((next) => {
    const snapshot = savePrevious(dataRef.current)
    if (!snapshot.ok) return snapshot
    const saved = saveData(next)
    if (!saved.ok) return saved
    dataRef.current = next
    setData(next)
    setSaveError(null)
    return { ok: true }
  }, [])

  const restorePrevious = useCallback(() => {
    const previous = loadPrevious()
    if (!previous) return { ok: false, error: 'There is no earlier copy to restore.' }
    return replaceAll(previous)
  }, [replaceAll])

  const value = useMemo(
    () => ({ data, update, notify, toast, dismissToast: () => setToast(null), replaceAll, restorePrevious, loadWarning, dismissLoadWarning: () => setLoadWarning(null), saveError }),
    [data, update, notify, toast, replaceAll, restorePrevious, loadWarning, saveError],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
