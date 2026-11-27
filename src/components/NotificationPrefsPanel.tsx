'use client'

import { CheckIcon } from './icons'
import { useEffect, useState } from 'react'
import { DEFAULT_PREFS, OTHER_NOTIFICATION_TYPES, type NotificationPrefs } from '@/lib/notifyShared'

export default function NotificationPrefsPanel() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile/notifications')
      .then((r) => r.json())
      .then((d) => setPrefs(d.prefs ?? DEFAULT_PREFS))
      .catch(() => setPrefs(DEFAULT_PREFS))
  }, [])

  async function toggle(key: keyof NotificationPrefs) {
    if (!prefs) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    const res = await fetch('/api/profile/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs: next })
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  if (!prefs) return <p className="text-slate-400">Caricamento...</p>

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="font-semibold text-slate-800">Quali notifiche ricevere</h2>
      <p className="text-sm text-slate-500 mt-1">
        Le <strong>menzioni</strong> nei commenti arrivano sempre e non si possono disattivare: hanno la priorità e compaiono in
        rosso sulla campanella. Gli altri avvisi compaiono nella scheda &quot;Altro&quot; con un contatore grigio.
      </p>
      <ul className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-lg">
        <li className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="text-slate-800">Qualcuno mi menziona in un commento</span>
          <span className="text-xs text-slate-400">sempre attiva</span>
        </li>
        {OTHER_NOTIFICATION_TYPES.map((t) => (
          <li key={t.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span className="text-slate-800">{t.label}</span>
            <input
              type="checkbox"
              checked={prefs[t.key]}
              onChange={() => toggle(t.key)}
              className="w-4 h-4 accent-brand-600"
              aria-label={t.label}
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400 mt-3">
        Le notifiche già lette si cancellano dopo 30 giorni, quelle non lette dopo 90.
        {saved && <span className="text-emerald-600 ml-2"><CheckIcon /> Salvato</span>}
      </p>
    </div>
  )
}
