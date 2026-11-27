'use client'

import { useCallback, useEffect, useState } from 'react'

// Totale delle notifiche (menzioni + altro) e quante sono da leggere; si aggiorna da solo quando cambiano.
export function useNotificationCounts(enabled: boolean): { total: number; unread: number } {
  const [n, setN] = useState({ total: 0, unread: 0 })
  const load = useCallback(() => {
    fetch('/api/notifications?kind=menzioni&page=1&pageSize=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setN({ total: d.totalMentions + d.totalOther, unread: d.unreadMentions + d.unreadOther })
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!enabled) return
    load()
    window.addEventListener('notifications-changed', load)
    return () => window.removeEventListener('notifications-changed', load)
  }, [enabled, load])
  return n
}
