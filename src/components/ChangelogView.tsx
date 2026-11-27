'use client'

import Breadcrumbs from './Breadcrumbs'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { CHANGELOG, formatChangelogDate, unreadChangelogCount } from '@/data/changelog'

const TAG_COLORS: Record<string, string> = {
  novità: 'bg-emerald-100 text-emerald-700',
  miglioramento: 'bg-blue-100 text-blue-700',
  correzione: 'bg-amber-100 text-amber-700'
}

export default function ChangelogView() {
  // le voci piu' recenti dell'ultima visita restano evidenziate in questa visita; poi si segnano come viste
  const [unread, setUnread] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/profile/changelog')
      .then((r) => r.json())
      .then((d) => {
        setUnread(unreadChangelogCount(d.seen))
        return fetch('/api/profile/changelog', { method: 'POST' })
      })
      .then(() => window.dispatchEvent(new Event('changelog-seen')))
      .catch(() => setUnread(0))
  }, [])

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Novità' }]} />

      <div className="space-y-3">
        {CHANGELOG.map((e, i) => {
          const isNew = unread !== null && i < unread
          return (
            <div
              key={e.id}
              className={clsx('bg-white border rounded-xl p-4', isNew ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200')}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[e.tag]}`}>{e.tag}</span>
                {isNew && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white">Nuovo</span>}
                <span className="text-xs text-slate-400">{formatChangelogDate(e.date)}</span>
              </div>
              <h2 className="font-semibold text-slate-800 mt-1.5">{e.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{e.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
