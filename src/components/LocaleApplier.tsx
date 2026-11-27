'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getTimeZone } from '@/lib/locale'

export function saveTzCookie(tz: string) {
  document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`
}

// Se il fuso salvato nel profilo e' diverso da quello con cui la pagina e' stata disegnata (primo accesso da un altro
// dispositivo), aggiorna il cookie e ricarica una volta.
export default function LocaleApplier() {
  const { status } = useSession()
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile/locale')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.timeZone && d.timeZone !== getTimeZone()) {
          saveTzCookie(d.timeZone)
          window.location.reload()
        }
      })
      .catch(() => {})
  }, [status])
  return null
}
