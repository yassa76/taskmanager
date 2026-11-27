'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { scopeIn } from '@/lib/permissionsShared'
import clsx from 'clsx'
import NotificationPrefsPanel from './NotificationPrefsPanel'
import NotificationRow, { notificationHref, type NotificationItem } from './NotificationRow'

export default function NotificationsView() {
  const router = useRouter()
  const { data: session } = useSession()
  const canDeleteNotifications = scopeIn((session?.user as any)?.permissions, 'notification', 'delete') !== 'none'
  const [kind, setKind] = useState<'menzioni' | 'altro'>('menzioni')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [unread, setUnread] = useState({ menzioni: 0, altro: 0 })
  const [totals, setTotals] = useState({ menzioni: 0, altro: 0 })
  // modalita' selezione: i check compaiono solo dopo aver scelto "Seleziona notifiche" dal menu
  const [menuOpen, setMenuOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

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

  function endSelect() {
    setSelecting(false)
    setSelected(new Set())
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!confirm(`Eliminare ${ids.length} ${ids.length === 1 ? 'notifica' : 'notifiche'}?`)) return
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    }).catch(() => {})
    endSelect()
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
              endSelect()
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

      <div className="flex items-center justify-between gap-2 text-sm text-slate-500 mb-2">
        <span>Le notifiche lette si cancellano dopo 30 giorni, quelle non lette dopo 90.</span>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-brand-600 hover:bg-slate-50"
            title="Opzioni delle notifiche"
            aria-label="Opzioni delle notifiche"
            aria-haspopup="menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm text-slate-700 z-40">
                <button
                  onClick={() => {
                    setSelecting(true)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                >
                  Seleziona notifiche…
                </button>
                <button
                  onClick={() => {
                    setPrefsOpen(true)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                >
                  Quali notifiche ricevere…
                </button>
                <button
                  disabled={unread[kind] === 0}
                  onClick={() => {
                    setMenuOpen(false)
                    markRead({ all: true, kind })
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:text-slate-300"
                >
                  Segna tutte come lette
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {selecting && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-700">{selected.size} selezionate</span>
          <button
            onClick={() => setSelected(new Set((items ?? []).map((i) => i.id)))}
            className="text-xs text-brand-600 hover:underline"
          >
            Seleziona tutte in questa pagina
          </button>
          <button
            disabled={selected.size === 0}
            onClick={async () => {
              await markRead({ ids: Array.from(selected) })
              endSelect()
            }}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
          >
            Segna come lette
          </button>
          {canDeleteNotifications && (
          <button
            disabled={selected.size === 0}
            onClick={deleteSelected}
            className="px-2.5 py-1 rounded-lg border border-red-200 bg-white text-red-600 disabled:opacity-40"
          >
            Elimina
          </button>
          )}
          <button onClick={endSelect} className="ml-auto text-xs text-slate-500 hover:text-brand-600">
            Fine
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {!items && <p className="px-4 py-6 text-sm text-slate-400">Caricamento...</p>}
        {items && items.length === 0 && <p className="px-4 py-8 text-sm text-slate-400 text-center">Nessuna notifica.</p>}
        {items?.map((i) =>
          selecting ? (
            <label key={i.id} className="flex items-stretch cursor-pointer hover:bg-slate-50">
              <span className="pl-3 flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={selected.has(i.id)}
                  onChange={() => toggle(i.id)}
                  aria-label="Seleziona notifica"
                />
              </span>
              <span className="flex-1 min-w-0 pointer-events-none">
                <NotificationRow item={i} onClick={() => {}} />
              </span>
            </label>
          ) : (
            <NotificationRow
              key={i.id}
              item={i}
              onClick={() => {
                if (!i.read) markRead({ ids: [i.id] })
                router.push(notificationHref(i))
              }}
            />
          )
        )}
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

      {prefsOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={() => setPrefsOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-3 sm:p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationPrefsPanel />
            <div className="flex justify-end mt-3">
              <button onClick={() => setPrefsOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
