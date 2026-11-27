'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import NotificationsView from './NotificationsView'

const THEMES: { key: string; label: string; swatch: string }[] = [
  { key: 'blue', label: 'Blu', swatch: '#2f49b3' },
  { key: 'orange', label: 'Arancione', swatch: '#ea580c' },
  { key: 'green', label: 'Verde', swatch: '#16a34a' },
  { key: 'purple', label: 'Viola', swatch: '#7c3aed' },
  { key: 'red', label: 'Rosso', swatch: '#dc2626' },
  { key: 'teal', label: 'Azzurro', swatch: '#0d9488' },
  { key: 'pink', label: 'Rosa', swatch: '#db2777' }
]

function PreferencesPanel() {
  const { update } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [themeColor, setThemeColor] = useState('blue')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setFirstName(data.firstName || '')
        setLastName(data.lastName || '')
        setEmail(data.email || '')
        setThemeColor(data.themeColor || 'blue')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (loading) return
    if (themeColor === 'blue') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', themeColor)
    }
  }, [themeColor, loading])

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), themeColor })
    })
    await update()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="text-slate-400">Caricamento...</p>

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nome</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Cognome</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Email</label>
          <input
            value={email}
            disabled
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-slate-50 text-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-2">Colore del tema</label>
          <div className="flex flex-wrap gap-3">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setThemeColor(t.key)}
                className={clsx(
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-lg border-2 transition',
                  themeColor === t.key ? 'border-slate-700' : 'border-transparent hover:border-slate-200'
                )}
                title={t.label}
              >
                <span className="w-8 h-8 rounded-full" style={{ backgroundColor: t.swatch }} />
                <span className="text-xs text-slate-500">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Salvato</span>}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 max-w-2xl">
        Informativa: gli amministratori possono vedere quando accedi e quando usi l&apos;app, e le modifiche che fai. Questi
        dati si cancellano automaticamente dopo un periodo limitato (di default 90 giorni).
      </p>
    </div>
  )
}

const TABS = [
  { id: 'preferenze', label: 'Preferenze personali' },
  { id: 'notifiche', label: 'Notifiche' }
]

export default function ProfileView() {
  const router = useRouter()
  const params = useSearchParams()
  const current = TABS.find((t) => t.id === params?.get('tab'))?.id ?? 'preferenze'

  // Somma di tutte le notifiche (menzioni + altro) e quante sono da leggere, sempre visibili nel tab
  const [notif, setNotif] = useState({ total: 0, unread: 0 })
  const loadCounts = useCallback(() => {
    fetch('/api/notifications?kind=menzioni&page=1&pageSize=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setNotif({ total: d.totalMentions + d.totalOther, unread: d.unreadMentions + d.unreadOther })
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    loadCounts()
    window.addEventListener('notifications-changed', loadCounts)
    return () => window.removeEventListener('notifications-changed', loadCounts)
  }, [loadCounts])

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-3">Il mio account</h1>

      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => router.replace(`/profile?tab=${t.id}`)}
            className={clsx(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap',
              t.id === current ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <span className={t.id === 'notifiche' && notif.unread > 0 ? 'font-bold' : undefined}>
              {t.label}
              {t.id === 'notifiche' ? ` (${notif.total})` : ''}
            </span>
            {t.id === 'notifiche' && notif.unread > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-semibold align-middle"
                title={`${notif.unread} non lette`}
              >
                {notif.unread} {notif.unread === 1 ? 'nuova' : 'nuove'}
              </span>
            )}
          </button>
        ))}
      </div>

      {current === 'preferenze' ? (
        <PreferencesPanel />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Le tue notifiche</h2>
            <NotificationsView />
          </section>
        </div>
      )}
    </div>
  )
}
