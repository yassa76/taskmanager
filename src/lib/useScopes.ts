'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { isViewScope, type ViewScope } from './scopesShared'

// Viste standard disponibili alla persona (vengono dal ruolo, calcolate dal server nella sessione).
// ownerBased: per Home e Report, che contano per proprietario.
export function useScopes(ownerBased = false): ViewScope[] {
  const { data: session } = useSession()
  const u = session?.user as any
  const list = (ownerBased ? u?.ownerScopes : u?.scopes) as ViewScope[] | undefined
  return list && list.length > 0 ? list : ['mine']
}

// Vista scelta (miei / team / tutti), ricordata e condivisa da Home, Report e liste:
// cambiandola in una pagina vale anche nelle altre, grafici compresi.
export function useScopePref(): { scope: ViewScope; setScope: (v: ViewScope) => void; ready: boolean } {
  const [scope, setScopeState] = useState<ViewScope>('mine')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recordsScope') ?? localStorage.getItem('homeScope') ?? localStorage.getItem('reportsScope')
      if (isViewScope(saved)) setScopeState(saved)
    } catch {}
    setReady(true)
  }, [])
  const setScope = useCallback((v: ViewScope) => {
    setScopeState(v)
    try {
      localStorage.setItem('recordsScope', v)
    } catch {}
  }, [])
  return { scope, setScope, ready }
}
