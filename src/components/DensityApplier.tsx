'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Applica la densita' scelta nel profilo ("narrow" = stretta) all'intera app; il cookie la ricorda al caricamento successivo.
export function applyDensity(density: string) {
  if (density === 'narrow') document.documentElement.setAttribute('data-density', 'narrow')
  else document.documentElement.removeAttribute('data-density')
  document.cookie = `density=${density === 'narrow' ? 'narrow' : 'wide'}; path=/; max-age=31536000; SameSite=Lax`
}

export default function DensityApplier() {
  const { status } = useSession()
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile/display')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && applyDensity(d.density))
      .catch(() => {})
  }, [status])
  return null
}
