'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import Link from 'next/link'
import NotificationRow, { notificationHref, type NotificationItem } from './NotificationRow'

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unreadMentions, setUnreadMentions] = useState(0)
  const [unreadOther, setUnreadOther] = useState(0)
  const [kind, setKind] = useState<'menzioni' | 'altro'>('menzioni')
  const [items, setItems] = useState<NotificationItem[]>([])
  const box = useRef<HTMLDivElement>(null)

  const load = useCallback(async (k: 'menzioni' | 'altro' = kind) => {
    try {
      const r = await fetch(`/api/notifications?kind=${k}&pageSize=10`)
      if (!r.ok) return
      const d = await r.json()
      setUnreadMentions(d.unreadMentions)
      setUnreadOther(d.unreadOther)
      setItems(d.items)
    } catch {}
  }, [kind])

  // aggiorna all'avvio, ogni minuto e quando si torna sulla scheda
  useEffect(() => {
    load()
    const t = setInterval(() => load(), 60000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function markRead(body: object) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {})
    load()
  }

  function openItem(i: NotificationItem) {
    setOpen(false)
    if (!i.read) markRead({ ids: [i.id] })
    router.push(notificationHref(i))
  }

  function switchKind(k: 'menzioni' | 'altro') {
    setKind(k)
    load(k)
  }

  const unreadInKind = kind === 'menzioni' ? unreadMentions : unreadOther

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => {
          if (!open) {
            // si apre sulle menzioni; se non ce ne sono da leggere ma ci sono altri avvisi, su "Altro"
            const k = unreadMentions === 0 && unreadOther > 0 ? 'altro' : 'menzioni'
            setKind(k)
            load(k)
          }
          setOpen((v) => !v)
        }}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-white/70"
        title="Avvisi: menzioni (in rosso) e altri aggiornamenti (in grigio)"
        aria-label={`Avvisi: ${unreadMentions} menzioni e ${unreadOther} altri non letti`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadMentions > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadMentions > 99 ? '99+' : unreadMentions}
          </span>
        )}
        {unreadOther > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-slate-400 text-white text-[9px] font-semibold flex items-center justify-center">
            {unreadOther > 99 ? '99+' : unreadOther}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] max-h-[28rem] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30">
          <div className="flex border-b border-slate-100">
            {(
              [
                { k: 'menzioni', label: 'Menzioni', n: unreadMentions, badge: 'bg-red-500' },
                { k: 'altro', label: 'Altro', n: unreadOther, badge: 'bg-slate-400' }
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => switchKind(t.k)}
                className={clsx(
                  'flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px',
                  kind === t.k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {t.label}
                {t.n > 0 && (
                  <span className={clsx('ml-1.5 px-1.5 rounded-full text-white text-[10px] align-middle', t.badge)}>{t.n}</span>
                )}
              </button>
            ))}
          </div>
          <div className="px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-100">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-brand-600 hover:underline">
              Vedi tutte
            </Link>
            {unreadInKind > 0 && (
              <button onClick={() => markRead({ all: true, kind })} className="text-brand-600 hover:underline">
                Segna tutti come letti
              </button>
            )}
          </div>
          {items.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">
              {kind === 'menzioni' ? 'Nessuna menzione.' : 'Nessun altro avviso.'}
            </p>
          )}
          {items.map((i) => (
            <NotificationRow key={i.id} item={i} onClick={() => openItem(i)} />
          ))}
        </div>
      )}
    </div>
  )
}
