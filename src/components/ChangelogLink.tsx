'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { unreadChangelogCount } from '@/data/changelog'

// Icona "Novità" (scintille) nella barra, con un pallino quando ci sono voci non ancora lette.
function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  )
}

export default function ChangelogLink({ mobile = false }: { mobile?: boolean }) {
  const [unread, setUnread] = useState(0)

  const load = useCallback(() => {
    fetch('/api/profile/changelog')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnread(unreadChangelogCount(d.seen)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('changelog-seen', load)
    return () => window.removeEventListener('changelog-seen', load)
  }, [load])

  if (mobile) {
    return (
      <Link href="/changelog" className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2">
        <SparkIcon />
        Novità {unread > 0 && <span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle ml-1" />}
      </Link>
    )
  }

  return (
    <Link
      href="/changelog"
      className="relative hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100"
      title={unread > 0 ? `Novità: ${unread} da leggere` : 'Novità: cosa c\'è di nuovo nella piattaforma'}
      aria-label="Novità"
    >
      <SparkIcon />
      {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />}
    </Link>
  )
}
