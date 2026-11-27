'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import NotificationRow, { notificationHref, type NotificationItem } from './NotificationRow'

export default function NotificationsView() {
  const router = useRouter()
  const [kind, setKind] = useState<'menzioni' | 'altro'>('menzioni')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [unread, setUnread] = useState({ menzioni: 0, altro: 0 })
  const [totals, setTotals] = useState({ menzioni: 0, altro: 0 })

  const load = useCallback(async () => {
    const r = await fetch(`/api/notifications?kind=${kind}&page=${page}&pageSize=25`)
    if (!r.ok) return
    const d = await r.json()
    setItems(d.items)
    setTotal(d.total)
    setPageSize(d.pageSize)
    setUnread({ menzioni: d.unreadMentions, altro: d.unreadOther })
    setTotals({ menzioni: d.totalMentions, altro: d.totalOther })
    // avvisa il profilo (etichetta del tab) che i conteggi possono essere cambiati
    window.dispatchEvent(new Event('notifications-changed'))
  }, [kind, page])

  useEffect(() => {
    load()
  }, [load])

  async function markRead(body: object) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {})
    load()
  }

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-3">
        {(
          [
            { k: 'menzioni', label: 'Menzioni' },
            { k: 'altro', label: 'Altro' }
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => {
              setKind(t.k)
              setPage(1)
              setItems(null)
            }}
            className={clsx(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2',
              kind === t.k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <span className={unread[t.k] > 0 ? 'font-bold text-slate-900' : undefined}>
              {t.label} ({totals[t.k]})
            </span>
            {unread[t.k] > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-semibold align-middle"
                title={`${unread[t.k]} non lette`}
              >
                {unread[t.k]} {unread[t.k] === 1 ? 'nuova' : 'nuove'}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
        <span>Le notifiche lette si cancellano dopo 30 giorni, quelle non lette dopo 90.</span>
        {unread[kind] > 0 && (
          <button onClick={() => markRead({ all: true, kind })} className="text-brand-600 hover:underline whitespace-nowrap ml-3">
            Segna tutte come lette
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {!items && <p className="px-4 py-6 text-sm text-slate-400">Caricamento...</p>}
        {items && items.length === 0 && <p className="px-4 py-8 text-sm text-slate-400 text-center">Nessuna notifica.</p>}
        {items?.map((i) => (
          <NotificationRow
            key={i.id}
            item={i}
            onClick={() => {
              if (!i.read) markRead({ ids: [i.id] })
              router.push(notificationHref(i))
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>{total.toLocaleString('it-IT')} notifiche</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
          >
            ←
          </button>
          <span>
            Pagina {page} di {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
