'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ColumnPref {
  order: string[]
  hidden: string[]
}

// Le preferenze di tutte le tabelle si scaricano una volta sola per pagina e si condividono.
let cache: Record<string, ColumnPref> | null = null
let inflight: Promise<Record<string, ColumnPref>> | null = null

async function loadAll(): Promise<Record<string, ColumnPref>> {
  if (cache) return cache
  if (!inflight) {
    inflight = fetch('/api/profile/columns')
      .then((r) => (r.ok ? r.json() : { tables: {} }))
      .then((d) => (cache = d.tables || {}))
      .catch(() => (cache = {}))
  }
  return inflight
}

/** Ordine e colonne nascoste di una tabella per l'utente corrente (salvati sul suo profilo). */
export function useColumnPrefs(tableId: string) {
  const [pref, setPref] = useState<ColumnPref | null>(cache ? cache[tableId] ?? null : null)

  useEffect(() => {
    let alive = true
    loadAll().then((all) => alive && setPref(all[tableId] ?? null))
    return () => {
      alive = false
    }
  }, [tableId])

  const save = useCallback(
    (next: ColumnPref) => {
      setPref(next)
      if (cache) cache[tableId] = next
      fetch('/api/profile/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, ...next })
      }).catch(() => {})
    },
    [tableId]
  )

  const reset = useCallback(() => {
    setPref(null)
    if (cache) delete cache[tableId]
    fetch('/api/profile/columns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, reset: true })
    }).catch(() => {})
  }, [tableId])

  return { pref, save, reset }
}
