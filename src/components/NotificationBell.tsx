'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

interface Item {
  id: string
  reason: 'menzione' | 'owner' | 'thread'
  read: boolean
  createdAt: string
  authorName: string
  entityType: 'task' | 'subtask'
  entityId: string
  entityTitle: string | null
  snippet: string
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

function reasonText(i: Item) {
  return `ti ha menzionato nel ${i.entityType === 'task' ? 'task' : 'sub-task'}`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const box = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      if (!r.ok) return
      const d = await r.json()
      setUnread(d.unread)
      setItems(d.items)
    } catch {}
  }, [])

  // aggiorna all'avvio, ogni minuto e quando si torna sulla scheda
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
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

  function openItem(i: Item) {
    setOpen(false)
    if (!i.read) markRead({ ids: [i.id] })
    router.push(`/${i.entityType === 'task' ? 'tasks' : 'subtasks'}/${i.entityId}#commenti`)
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) load()
        }}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-white/70"
        title="Avvisi: quando qualcuno ti menziona in un commento"
        aria-label={`Avvisi${unread ? `, ${unread} non letti` : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-800">Menzioni</span>
            {unread > 0 && (
              <button onClick={() => markRead({ all: true })} className="text-xs text-brand-600 hover:underline">
                Segna tutti come letti
              </button>
            )}
          </div>
          {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400 text-center">Nessuna menzione.</p>}
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => openItem(i)}
              className={clsx('w-full text-left px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 text-sm', !i.read && 'bg-brand-50/50')}
            >
              <div className="flex items-start gap-2">
                {!i.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700">
                    <span className="font-medium">{i.authorName}</span> {reasonText(i)}{' '}
                    <span className="font-medium">«{i.entityTitle ?? 'eliminato'}»</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">{i.snippet}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{whenLabel(i.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
