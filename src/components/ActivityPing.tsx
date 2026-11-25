'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const MIN_INTERVAL_MS = 10 * 60 * 1000

// Segnala al server che la persona sta usando l'app: al massimo una volta ogni 10 minuti
// e solo dopo un'interazione vera (click, tastiera) con la scheda visibile.
export default function ActivityPing() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    let last = 0
    function ping() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last < MIN_INTERVAL_MS) return
      last = now
      fetch('/api/activity/ping', { method: 'POST' }).catch(() => {})
    }
    ping()
    window.addEventListener('pointerdown', ping)
    window.addEventListener('keydown', ping)
    return () => {
      window.removeEventListener('pointerdown', ping)
      window.removeEventListener('keydown', ping)
    }
  }, [status])

  return null
}
