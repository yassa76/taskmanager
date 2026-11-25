'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { unreadChangelogCount } from '@/data/changelog'

// Link "Novità" nella barra, con un pallino quando ci sono voci non ancora lette.
export default function ChangelogLink() {
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

  return (
    <Link
      href="/changelog"
      className="relative text-sm text-slate-600 hover:text-brand-600 font-medium hidden sm:block"
      title="Cosa c'è di nuovo nella piattaforma"
    >
      Novità
      {unread > 0 && <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500" />}
    </Link>
  )
}
