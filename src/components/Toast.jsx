import { useEffect } from 'react'
import { useStore } from '../data/store'

export default function Toast() {
  const { toast, dismissToast } = useStore()
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(dismissToast, toast.kind === 'error' ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [toast, dismissToast])
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.kind}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  )
}
